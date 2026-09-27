const $ = id => document.getElementById(id);
const send = msg => chrome.runtime.sendMessage(msg);

$('redirect').textContent = chrome.identity.getRedirectURL();
$('copy').onclick = () => navigator.clipboard.writeText($('redirect').textContent);

async function refresh() {
  const { clientId = '', email } = await chrome.storage.sync.get(['clientId', 'email']);
  $('clientId').value = clientId;
  $('status').textContent = email ? `Connected as ${email}.` : 'Not connected.';
  $('connect').disabled = !clientId;
  $('disconnect').hidden = !email;
}

$('save').onclick = async () => {
  await chrome.storage.sync.set({ clientId: $('clientId').value.trim() });
  refresh();
};

$('connect').onclick = async () => {
  $('status').textContent = 'Waiting for Google…';
  const r = await send({ type: 'connect' });
  if (!r.ok) $('status').textContent = `Could not connect (${r.error}). Check the client ID, redirect URI and test user.`;
  else refresh();
};

$('disconnect').onclick = async () => {
  await send({ type: 'disconnect' });
  refresh();
};

refresh();
