# Security

This extension reads your email, so its security rules are the main feature, not an extra.

## Reporting a problem

Please use [private vulnerability reporting](https://github.com/SeanZoR/gmail-otp-fill/security/advisories/new), not a public issue. You should get a reply within a few days.

## What it protects against

| Threat | Defence |
|---|---|
| **Phishing relay.** A fake page asks for "the code we emailed you" while the attacker logs into your real account. | A code is offered only on a page whose registered domain matches the sender's (`stripe.com` mail → `*.stripe.com`). Look-alikes like `stripe.help` or `stripe.com.evil.io` get nothing. |
| **Forged sender.** An email that claims to be from `stripe.com` but isn't. | Gmail's own DMARC result must pass for the From domain. The display name is never trusted. |
| **User-made subdomains.** Anyone can create `evil.substack.com`. | Auto-paste works only on the main domain or on a subdomain the email links to by name. Everywhere else you get a chip and must click. |
| **Websites talking to the extension.** | There is no `externally_connectable`, so pages can't send it messages. The code chip lives in a closed shadow root. |
| **Token theft.** | The token is read-only (`gmail.readonly`), lasts one hour, and lives in `chrome.storage.session`. Content scripts can't read it, and it is gone when the browser closes. |
| **A shared OAuth app getting breached.** | There isn't one. Every user creates their own Google OAuth client, so no third party ever has access to anyone's mail. |
| **Silent code changes.** | You load it from source. Nothing updates unless you pull and reload. |

## What it does not protect against

- Malware or another extension on your machine that can already read your browser.
- A service that sends codes from a domain other than its own website. The code shows only in the toolbar popup, with a warning.
- You pasting a code from the popup into the wrong site.

## Scope of access

- **Google:** `https://www.googleapis.com/auth/gmail.readonly`. It can't send, delete, label or change mail.
- **Chrome:** `identity`, `storage`, `activeTab`, and network access to `gmail.googleapis.com` only. A content script runs on pages to spot code fields. It sends the extension nothing but the page's hostname.
