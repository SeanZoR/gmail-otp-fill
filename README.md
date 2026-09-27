# Gmail OTP Fill

A Chrome extension for sites that email you a sign-in code. It spots the code field, finds the code in your Gmail, and offers to paste it. Nothing fills until you click.

![The chip next to a code field](docs/chip.png)

## How it works

- **Spots the field.** It looks for `autocomplete="one-time-code"`, a row of 4–8 one-digit boxes, or a field named like "code", "OTP" or "verify" on a page that mentions email.
- **Checks Gmail.** It reads mail from the last 10 minutes (read-only) and pulls out the code.
- **Offers it only to the right site.** The chip appears only if the email's sender domain is the same as the site's (`stripe.com` mail on `*.stripe.com`), and Gmail says that domain passed DMARC. Click **Paste** to fill the field. It keeps checking for 3 minutes in case the email is slow.
- **Auto-paste on an exact match.** If the page is the site's main domain (`substack.com`), or a subdomain the email links to by name, the code goes straight into the field and an **Undo** notice shows for 8 seconds. It only fills an empty field that's on screen, in the tab you're looking at, and it never presses Submit. You can turn it off in Options.
- **Toolbar button.** Shows the latest code from any sender, with its domain and a warning if it doesn't match the tab. Use it for services that email from a different domain.

## Security

- **Phishing relay.** A fake "enter the code we emailed you" page never gets a chip. `stripe.help`, `stripe.com.evil.io` and forged From headers all fail the domain + DMARC check.
- **User subdomains.** On a subdomain, auto-paste also needs the email to link to that exact hostname. So `evil.substack.com` never gets a code pasted on its own, even though the domains match.

- Your mail goes straight from Google to your browser. There's no server, analytics or telemetry.
- It uses **your own** Google OAuth client, so no third party ever gets access to your inbox.
- The scope is `gmail.readonly`. It can't send, delete or change mail.
- Sites only see the code you choose to paste.
- The access token lives in `chrome.storage.session` and is cleared when the browser closes.

## Install

1. Clone this repo, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the folder.
2. The setup page opens from the extension's **Options**. It walks you through creating a Google OAuth client:
   - Create a Google Cloud project and enable the Gmail API.
   - In Google Auth Platform, pick **External** and add your Gmail address as a **test user**.
   - Create a **Web application** client with this redirect URI: `https://mnajiabfjdigihpcnfjjhlpkefioacai.chromiumapp.org/`
   - Paste the client ID, then click **Connect Gmail**.

The `key` in `manifest.json` pins the extension ID, so the redirect URI stays the same wherever you put the folder.

## Develop

```sh
npm test   # code-extraction tests, plain Node, no dependencies
```

To test the chip without Gmail, serve the repo root (`python3 -m http.server`) and open `test/fixture.html`. It stubs `chrome.runtime`.

## License

MIT
