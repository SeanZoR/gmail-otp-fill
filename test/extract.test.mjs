import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCode, htmlToText, payloadText, rootDomain, matchesSite, senderDomain, dmarcPass, linkedHosts, hostInEmail } from '../extract.js';

const code = (s, b) => extractCode(s, b)?.code ?? null;

test('common code emails', () => {
  assert.equal(code('Your verification code', 'Your code is 482913. It expires in 10 minutes.'), '482913');
  assert.equal(code('482913 is your Slack confirmation code', ''), '482913');
  assert.equal(code('Sign in to Acme', 'Enter this code to sign in:\n\n  731 204\n\nDidn\'t ask? Ignore.'), '731204');
  assert.equal(code('Login code', 'Use 552-019 to log in'), '552019');
  assert.equal(code('Security code', 'Your one-time passcode: 8812'), '8812');
  assert.equal(code('Verify your email', 'Your code: A7K2QX'), 'A7K2QX');
  assert.equal(code('קוד אימות', 'הקוד שלך הוא 604211'), '604211');
});

test('ignores numbers that are not codes', () => {
  assert.equal(code('Your order #123456 has shipped', 'Order number 123456. Total $45.99'), null);
  assert.equal(code('Newsletter', 'Our 2026 roadmap and 15% off'), null);
  assert.equal(code('Receipt', 'Call us at +1 503 555 0199'), null);
});

test('prefers the code over nearby numbers', () => {
  assert.equal(code('Verify', '© 2026 Acme Inc, 1600 Main St.\nYour verification code is 993311'), '993311');
  assert.equal(code('Your code', 'Order 12345678 needs confirmation. Code: 246810'), '246810');
});

test('html emails', () => {
  const html = '<html><head><style>.x{color:red}</style></head><body><p>Your code</p><div><span style="font-size:32px">&nbsp;318 402&nbsp;</span></div></body></html>';
  assert.equal(code('Sign-in attempt', htmlToText(html)), '318402');
});

test('gmail payload decoding', () => {
  const b64 = s => Buffer.from(s).toString('base64url');
  const payload = { mimeType: 'multipart/alternative', parts: [
    { mimeType: 'text/plain', body: { data: b64('Code: 111222') } },
    { mimeType: 'text/html', body: { data: b64('<b>999888</b>') } },
  ] };
  assert.equal(payloadText(payload), 'Code: 111222');
});

test('site matching is strict', () => {
  assert.equal(rootDomain('login.stripe.com'), 'stripe.com');
  assert.equal(rootDomain('shop.example.co.uk'), 'example.co.uk');
  assert.ok(matchesSite('Stripe <no-reply@stripe.com>', 'dashboard.stripe.com'));
  assert.ok(matchesSite('Notion Team <notify@mail.notion.so>', 'www.notion.so'));
  assert.ok(!matchesSite('GitHub <noreply@github.com>', 'stripe.com'));
});

test('look-alike phishing sites get nothing', () => {
  const stripe = 'Stripe <no-reply@stripe.com>';
  for (const host of ['stripe.help', 'stripe-login.com', 'stripe.com.evil.io', 'evil.io', 'xn--strpe-9ua.com'])
    assert.ok(!matchesSite(stripe, host), host);
  // display name can't fake the domain
  assert.ok(!matchesSite('"no-reply@stripe.com" <attacker@evil.io>', 'stripe.com'));
  assert.equal(senderDomain('"no-reply@stripe.com" <attacker@evil.io>'), 'evil.io');
});

test('dmarc must pass for the From domain', () => {
  const ok = 'mx.google.com; dkim=pass header.i=@stripe.com; spf=pass smtp.mailfrom=bounce.stripe.com; dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=stripe.com';
  assert.ok(dmarcPass([ok], 'stripe.com'));
  assert.ok(dmarcPass([ok], 'mail.stripe.com'));
  assert.ok(!dmarcPass([ok.replace('dmarc=pass', 'dmarc=fail')], 'stripe.com'));
  assert.ok(!dmarcPass([ok], 'evil.io'));
  assert.ok(!dmarcPass([], 'stripe.com'));
});

test('auto-paste needs the exact host linked in the email', () => {
  const b64 = t => Buffer.from(t).toString('base64url');
  const payload = { mimeType: 'text/html', body: { data: b64(
    '<p>542603</p><a href="https://substack.com/sign-in?x=1">Sign in</a><a href="https://WWW.substack.com/tos">Terms</a>') } };
  const hosts = linkedHosts(payload);
  assert.ok(hostInEmail('substack.com', hosts));
  assert.ok(hostInEmail('www.substack.com', hosts));
  assert.ok(!hostInEmail('evil.substack.com', hosts));
  assert.ok(!hostInEmail('substack.com.evil.io', hosts));
});
