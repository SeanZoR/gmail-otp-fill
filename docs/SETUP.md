# Setup guide

About 5 minutes. You create a small Google OAuth client that only you can use. That's why no one else can ever reach your mail through this extension.

## 1. Install the extension

1. Download `gmail-otp-fill-<version>.zip` from the [latest release](https://github.com/SeanZoR/gmail-otp-fill/releases) and unzip it. Or clone the repo.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the folder. You can also drag the folder onto the page.
4. Pin the envelope icon so you can reach it.

## 2. Create a Google Cloud project

1. Open [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate). Check the account in the top right is the Gmail you want to use.
2. Name it anything, for example `Gmail OTP Fill`, and click **Create**.
3. Open the [Gmail API page](https://console.cloud.google.com/apis/library/gmail.googleapis.com), check your new project is selected, and click **Enable**.

> Google Cloud may ask you to turn on 2-step verification for your Google account first.

## 3. Set up the consent screen

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and click **Get started**.
2. **App name:** `Gmail OTP Fill`. **Support email:** your address.
3. **Audience:** pick **External**.
4. **Contact information:** your address. Agree to the policy and click **Create**.
5. Go to **Audience**, then **Test users**, then **Add users**. Add your own Gmail address and click **Save**.

Leave the app in **Testing**. You don't need Google's verification, because you're the only user.

## 4. Create the OAuth client

1. Go to [Clients](https://console.cloud.google.com/auth/clients), then **Create client**.
2. **Application type:** Web application. **Name:** anything.
3. Under **Authorized redirect URIs**, click **Add URI** and paste:
   ```
   https://mnajiabfjdigihpcnfjjhlpkefioacai.chromiumapp.org/
   ```
4. Click **Create** and copy the **Client ID**. You don't need the client secret.

## 5. Connect

1. Right-click the envelope icon and choose **Options**.
2. Paste the client ID and click **Save**.
3. Click **Connect Gmail** and pick your account.
4. Google warns that the app isn't verified. It's your own app, so click **Continue**, then allow read access.

The page should now say **Connected as you@gmail.com**.

## Test it

Sign out of a site that emails you codes, such as [Substack](https://substack.com/sign-in), then sign in with an emailed code. Stay on the tab. The code should appear within a few seconds of the email arriving.

## Troubleshooting

| Problem | Fix |
|---|---|
| `redirect_uri_mismatch` | The URI in step 4 must match exactly, including `https://` and the trailing `/`. |
| `access_denied`, or "app not available" | Add your address as a test user (step 3.5). |
| The chip never shows | Open the toolbar popup. If the code is there with a warning, the sender's domain differs from the site's, which is expected for some services. If it isn't there, [open an issue](https://github.com/SeanZoR/gmail-otp-fill/issues/new?template=site-not-working.yml). |
| "Connect Gmail" chip keeps coming back | The silent token refresh failed. Click it once to sign in again. |
