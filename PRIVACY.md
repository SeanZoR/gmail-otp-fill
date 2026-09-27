# Privacy

Gmail OTP Fill has no server, no analytics and no telemetry. The author never sees your data.

- **What it reads:** Gmail messages from the last 10 minutes, and only when a page shows a code field or you open the toolbar popup.
- **Where it goes:** from Google's Gmail API straight to your browser. It is parsed in memory and not stored.
- **What it stores:** your OAuth client ID and Gmail address in `chrome.storage.sync`. It keeps the access token and the IDs of codes you've already used in `chrome.storage.session`, which is cleared when the browser closes.
- **What websites see:** only the code you paste, or the one it auto-pastes on an exact match.
- **Your OAuth client:** you create it in your own Google Cloud project, so you control it and can delete it at any time.
- **Removing access:** click **Disconnect** in Options, or revoke it at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
