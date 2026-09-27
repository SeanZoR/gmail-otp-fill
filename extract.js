// Pull a verification code out of an email. Pure functions, no Chrome APIs,
// so the tests can run in plain Node.

const KEYWORD = /(code|verif|otp|one[- ]?time|passcode|pin\b|security|log ?in|sign[- ]?in|confirm|2fa|authenticat|קוד|รหัส)/i;
const RIGHT_BEFORE = /(code|otp|passcode|pin|token)\W{0,3}(is|was|:)?\W{0,3}$/i;
const NOT_A_CODE = /(order|invoice|receipt|ref|reference|account|acct|phone|tel|fax|zip|suite|unit|no\.?|number|#|\+)\W{0,3}$/i;

// Candidates: 123456, 123-456, 123 456, or A1B2C3-style mixed caps+digits.
const CANDIDATE = /(?<![\w$€£¥#@+./:-])(\d{3}[ -]\d{3}|\d{4,8}|[A-Z0-9]{5,8})(?![\w%@/]|[.,:-]\w)/g;

export function extractCode(subject = '', body = '') {
  const text = `${subject}\n${body}`.replace(/ /g, ' ');
  const subjectEnd = subject.length;
  let best = null;

  for (const m of text.matchAll(CANDIDATE)) {
    const raw = m[1];
    const code = raw.replace(/[ -]/g, '');
    const digits = /^\d+$/.test(code);
    if (!digits && !(/\d/.test(code) && /[A-Z]/.test(code))) continue;

    const before = text.slice(Math.max(0, m.index - 80), m.index);
    const after = text.slice(m.index + raw.length, m.index + raw.length + 40);
    let score = 0;
    if (KEYWORD.test(before)) score += 5;
    else if (/^\W{0,3}(is|was)\b[^.\n]{0,25}(code|otp|passcode|pin)/i.test(after)) score += 4;
    if (RIGHT_BEFORE.test(before)) score += 5;
    if (NOT_A_CODE.test(before)) score -= 8;
    if (m.index < subjectEnd) score += 2;
    if (digits && code.length === 6) score += 2;
    else if (digits) score += 1;
    else score -= 1;
    if (digits && code.length === 4 && /^(19|20)\d\d$/.test(code)) score -= 4;

    if (!best || score > best.score) best = { code, score };
  }
  return best && best.score >= 5 ? best : null;
}

export function htmlToText(html) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|td|tr|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s*/g, '\n');
}

function decodeBase64Url(data) {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

function payloadBodies(payload) {
  const plain = [], html = [];
  (function walk(p) {
    if (!p) return;
    if (p.body?.data) {
      if (p.mimeType === 'text/plain') plain.push(decodeBase64Url(p.body.data));
      else if (p.mimeType === 'text/html') html.push(decodeBase64Url(p.body.data));
    }
    (p.parts || []).forEach(walk);
  })(payload);
  return { plain, html };
}

// Walk a Gmail API payload and return its text, preferring text/plain.
export function payloadText(payload) {
  const { plain, html } = payloadBodies(payload);
  return plain.length ? plain.join('\n') : htmlToText(html.join('\n'));
}

// Every hostname the email links to, "www." stripped.
export function linkedHosts(payload) {
  const { plain, html } = payloadBodies(payload);
  const text = [...plain, ...html].join('\n');
  return new Set([...text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)]
    .map(m => m[1].toLowerCase().replace(/^www\./, '')));
}

// Is the page host safe to auto-paste into? The apex (substack.com, www.substack.com)
// belongs to the company. Other subdomains may be user-made (evil.substack.com), so
// those need the email to link to that exact host.
export function autoPasteHost(host = '', hosts = new Set()) {
  const h = host.toLowerCase().replace(/^www\./, '');
  return h === rootDomain(h) || hosts.has(h);
}

// "login.stripe.com" -> "stripe.com", "shop.example.co.uk" -> "example.co.uk"
export function rootDomain(host = '') {
  const parts = host.toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const [sld, tld] = parts.slice(-2);
  const n = tld.length === 2 && sld.length <= 3 ? 3 : 2;
  return parts.slice(-n).join('.');
}

export function senderDomain(fromHeader = '') {
  return ((fromHeader.match(/@([\w.-]+)>?\s*$/) || [])[1] || '').toLowerCase();
}

// Gmail's own verdict that the From domain is real (DMARC pass, aligned with From).
export function dmarcPass(authResults = [], fromDomain = '') {
  const root = rootDomain(fromDomain);
  return authResults.some(h => {
    const from = (h.match(/dmarc=pass[^;]*header\.from=([\w.-]+)/i) || [])[1];
    return from && rootDomain(from) === root;
  });
}

// Strict: the sender's registered domain must equal the site's. No brand-name guessing,
// so a look-alike page (stripe.help) never gets a code meant for stripe.com.
export function matchesSite(fromHeader = '', host = '') {
  if (!host) return false;
  const from = senderDomain(fromHeader);
  return !!from && rootDomain(from) === rootDomain(host);
}
