import { extractCode, payloadText, matchesSite, senderDomain, dmarcPass, linkedHosts, hostInEmail } from './extract.js';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const LOOKBACK_SECONDS = 10 * 60;
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/';

async function getToken(interactive) {
  const { tok } = await chrome.storage.session.get('tok');
  if (tok && tok.exp > Date.now() + 60_000) return tok.value;

  const { clientId, email } = await chrome.storage.sync.get(['clientId', 'email']);
  if (!clientId) throw new Error('NO_CLIENT_ID');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: SCOPE,
    ...(email && { login_hint: email }),
    ...(!interactive && { prompt: 'none' }),
  });

  let redirect;
  try {
    redirect = await chrome.identity.launchWebAuthFlow({ url: url.href, interactive });
  } catch {
    throw new Error('NEED_AUTH');
  }
  const params = new URLSearchParams(new URL(redirect).hash.slice(1));
  const value = params.get('access_token');
  if (!value) throw new Error('NEED_AUTH');

  const exp = Date.now() + Number(params.get('expires_in') || 3600) * 1000;
  await chrome.storage.session.set({ tok: { value, exp } });
  return value;
}

async function gmail(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    await chrome.storage.session.remove('tok');
    throw new Error('NEED_AUTH');
  }
  if (!res.ok) throw new Error(`GMAIL_${res.status}`);
  return res.json();
}

// Newest code from the last 10 minutes.
// In a page (anyDomain=false): only codes whose verified sender domain equals the site's.
// In the toolbar popup (anyDomain=true): any sender, shown with its domain.
async function findCode(host, anyDomain) {
  const token = await getToken(false);
  const after = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
  const q = encodeURIComponent(`after:${after} -from:me`);
  const list = await gmail(`messages?q=${q}&maxResults=10`, token);
  if (!list.messages) return null;

  const { used = [] } = await chrome.storage.session.get('used');
  const { autoPaste = true } = await chrome.storage.sync.get('autoPaste');
  const msgs = await Promise.all(
    list.messages
      .filter(m => !used.includes(m.id))
      .map(m => gmail(`messages/${m.id}?format=full`, token))
  );

  let best = null;
  for (const msg of msgs) {
    const headers = msg.payload.headers;
    const header = name => headers.find(h => h.name.toLowerCase() === name)?.value || '';
    const subject = header('subject');
    const from = header('from');
    const domain = senderDomain(from);
    const verified = dmarcPass(
      headers.filter(h => h.name.toLowerCase() === 'authentication-results').map(h => h.value), domain);
    const siteMatch = verified && matchesSite(from, host);
    if (!anyDomain && !siteMatch) continue;
    const hit = extractCode(subject, payloadText(msg.payload));
    if (!hit) continue;

    const found = {
      id: msg.id,
      code: hit.code,
      sender: from.replace(/\s*<.*>$/, '').replace(/"/g, '') || from,
      subject,
      domain,
      verified,
      at: Number(msg.internalDate),
      siteMatch,
      auto: autoPaste && siteMatch && hostInEmail(host, linkedHosts(msg.payload)),
    };
    if (!best || found.siteMatch > best.siteMatch ||
        (found.siteMatch === best.siteMatch && found.at > best.at)) best = found;
  }
  return best;
}

async function connect() {
  await chrome.storage.session.remove('tok');
  const token = await getToken(true);
  const profile = await gmail('profile', token);
  await chrome.storage.sync.set({ email: profile.emailAddress });
  return profile.emailAddress;
}

async function disconnect() {
  const { tok } = await chrome.storage.session.get('tok');
  if (tok) fetch(`https://oauth2.googleapis.com/revoke?token=${tok.value}`, { method: 'POST' }).catch(() => {});
  await chrome.storage.session.clear();
  await chrome.storage.sync.remove('email');
}

async function markUsed(id) {
  const { used = [] } = await chrome.storage.session.get('used');
  const { autoPaste = true } = await chrome.storage.sync.get('autoPaste');
  await chrome.storage.session.set({ used: [...used, id].slice(-50) });
}

const handlers = {
  find: m => findCode(m.host, m.anyDomain === true),
  connect: () => connect(),
  disconnect: () => disconnect(),
  used: m => markUsed(m.id),
  options: () => chrome.runtime.openOptionsPage(),
};

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const handler = handlers[msg.type];
  if (!handler) return false;
  handler(msg)
    .then(result => reply({ ok: true, result }))
    .catch(e => reply({ ok: false, error: e.message }));
  return true;
});
