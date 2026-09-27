const $ = id => document.getElementById(id);
const send = msg => chrome.runtime.sendMessage(msg);

function action(label, type) {
  $('action').textContent = label;
  $('action').hidden = false;
  $('action').onclick = async () => {
    const r = await send({ type });
    if (type === 'connect' && r.ok) load();
  };
}

async function load() {
  $('action').hidden = true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = tab?.url ? new URL(tab.url).hostname : '';
  const r = await send({ type: 'find', host });

  if (r.ok && r.result) {
    const { code, sender, at } = r.result;
    const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
    $('msg').hidden = true;
    $('found').hidden = false;
    $('code').textContent = code;
    $('from').textContent = `${sender} · ${mins} min ago`;
    $('copyCode').onclick = async () => {
      await navigator.clipboard.writeText(code);
      $('copyCode').textContent = 'Copied';
    };
  } else if (r.ok) {
    $('msg').textContent = 'No code in the last 10 minutes.';
  } else if (r.error === 'NO_CLIENT_ID') {
    $('msg').textContent = 'Not set up yet.';
    action('Open setup', 'options');
  } else if (r.error === 'NEED_AUTH') {
    $('msg').textContent = 'Gmail is not connected.';
    action('Connect Gmail', 'connect');
  } else {
    $('msg').textContent = `Error: ${r.error}`;
  }
}

load();
