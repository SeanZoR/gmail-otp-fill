// Finds a verification-code field, asks the background worker for a fresh
// code from Gmail, and shows a small "Paste" chip next to the field.
(() => {
  if (window.__gmailOtpFill) return;
  window.__gmailOtpFill = true;

  const HINT = /(one[-_ ]?time|otp|verif|passcode|2fa|mfa|security[-_ ]?code|auth\w*[-_ ]?code|confirm\w*[-_ ]?code|\bcode\b|token|\bpin\b)/i;
  const NOT_OTP = /(zip|postal|promo|coupon|discount|gift|voucher|country|area|phone|tel\b|card|cvc|cvv|search|referral|invite)/i;
  const MENTIONS_EMAIL = /(e-?mail|inbox|אימייל|מייל|อีเมล)/i;
  const POLL_MS = 4000;
  const POLL_MAX = 45; // 3 minutes

  let target = null;   // { boxes: HTMLInputElement[] }
  let chip = null;
  let polls = 0;
  let pollTimer = null;
  let dismissed = false;

  const visible = el => el.offsetWidth > 0 && el.offsetHeight > 0;
  const describe = el => [el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
    el.autocomplete, el.labels?.[0]?.textContent].join(' ');

  function findTarget() {
    const inputs = [...document.querySelectorAll('input')].filter(el =>
      ['text', 'tel', 'number', 'password', ''].includes(el.type) &&
      !el.disabled && !el.readOnly && visible(el));

    const singles = inputs.filter(el => el.maxLength === 1);
    const otc = inputs.find(el => el.autocomplete === 'one-time-code');
    if (otc) return { boxes: otc.maxLength === 1 && singles.length >= 4 ? singles : [otc] };

    const pageText = document.body?.innerText.slice(0, 5000) || '';
    if (!MENTIONS_EMAIL.test(pageText)) return null;

    if (singles.length >= 4 && singles.length <= 8) return { boxes: singles };

    const hinted = inputs.find(el => el.type !== 'password' &&
      HINT.test(describe(el)) && !NOT_OTP.test(describe(el)) &&
      (el.maxLength < 0 || (el.maxLength >= 4 && el.maxLength <= 10)));
    return hinted ? { boxes: [hinted] } : null;
  }

  const send = msg => new Promise(resolve =>
    chrome.runtime.sendMessage(msg, r => resolve(chrome.runtime.lastError ? { ok: false } : r)));

  async function poll() {
    clearTimeout(pollTimer);
    if (!target || dismissed) return;
    if (document.visibilityState === 'visible') {
      const r = await send({ type: 'find', host: location.hostname });
      if (!target || dismissed) return;
      if (r?.ok && r.result) return r.result.auto && canAutoPaste() ? autoPaste(r.result) : showCode(r.result);
      if (r?.error === 'NEED_AUTH') return showAction('Connect Gmail to fill codes', 'connect');
      if (r?.error === 'NO_CLIENT_ID') return showAction('Set up Gmail OTP Fill', 'options');
    }
    if (++polls < POLL_MAX) pollTimer = setTimeout(poll, POLL_MS);
  }

  // Set through the native setter so React/Vue inputs notice the change.
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  function setValue(el, v) {
    el.focus();
    nativeSetter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fill(code) {
    const { boxes } = target;
    if (boxes.length === 1) setValue(boxes[0], code);
    else [...code].forEach((c, i) => boxes[i] && setValue(boxes[i], c));
    navigator.clipboard?.writeText(code).catch(() => {});
  }

  // Only into an empty field you can see, in the tab you're looking at.
  function canAutoPaste() {
    const el = target.boxes[0];
    const r = el.getBoundingClientRect();
    return document.visibilityState === 'visible' && document.hasFocus() &&
      target.boxes.every(b => !b.value) &&
      r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }

  function autoPaste(found) {
    fill(found.code);
    send({ type: 'used', id: found.id });
    const root = makeChip(`✓ Pasted <span class="code">${esc(found.code)}</span>
      <span class="from">from ${esc(found.domain)}</span>
      <button class="go">Undo</button>`);
    root.querySelector('.go').onclick = () => {
      target.boxes.forEach(b => setValue(b, ''));
      target.boxes[0].focus();
      dismissed = true;
      removeChip();
    };
    setTimeout(() => { if (chip?.root === root) { dismissed = true; removeChip(); } }, 8000);
  }

  function makeChip(html) {
    removeChip();
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>
      .c{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-radius:10px;
        font:13px/1.2 system-ui,sans-serif;background:#1f1f1f;color:#fff;
        box-shadow:0 4px 16px rgba(0,0,0,.25);max-width:360px}
      .code{font:600 15px ui-monospace,monospace;letter-spacing:.08em}
      .from{opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px}
      button{font:inherit;border:0;border-radius:7px;padding:5px 10px;cursor:pointer}
      .go{background:#8ab4f8;color:#000;font-weight:600}
      .x{background:transparent;color:#fff;opacity:.6;padding:5px 7px}
    </style><div class="c">${html}<button class="x" title="Dismiss">✕</button></div>`;
    root.querySelector('.x').onclick = () => { dismissed = true; removeChip(); };
    document.documentElement.appendChild(host);
    chip = { host, root };
    place();
    return root;
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function showCode(found) {
    const root = makeChip(`✉️ <span class="code">${esc(found.code)}</span>
      <span class="from" title="${esc(found.sender)}: ${esc(found.subject)}">from ${esc(found.domain)}</span>
      <button class="go">Paste</button>`);
    root.querySelector('.go').onclick = () => {
      fill(found.code);
      send({ type: 'used', id: found.id });
      dismissed = true;
      removeChip();
    };
  }

  function showAction(label, type) {
    const root = makeChip(`✉️ <button class="go">${esc(label)}</button>`);
    root.querySelector('.go').onclick = async () => {
      removeChip();
      const r = await send({ type });
      if (type === 'connect' && r?.ok) { polls = 0; poll(); }
    };
  }

  function place() {
    if (!chip || !target) return;
    const r = target.boxes[0].getBoundingClientRect();
    chip.host.style.top = `${Math.min(r.bottom + 6, innerHeight - 50)}px`;
    chip.host.style.left = `${Math.max(8, r.left)}px`;
  }

  function removeChip() {
    chip?.host.remove();
    chip = null;
  }

  function scan() {
    if (target && target.boxes.every(el => el.isConnected && visible(el))) return;
    if (target) { removeChip(); target = null; clearTimeout(pollTimer); }
    const found = findTarget();
    if (!found) return;
    target = found;
    polls = 0;
    dismissed = false;
    poll();
  }

  let scanTimer;
  new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 500);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
  document.addEventListener('visibilitychange', () => { if (target && !chip && !dismissed) poll(); });
  scan();
})();
