# Contributing

Thanks for helping. The most useful thing you can send is a site where it doesn't work.

## Report a site

Open a ["A site doesn't work"](https://github.com/SeanZoR/gmail-otp-fill/issues/new?template=site-not-working.yml) issue. The code field's HTML and the sender address are usually enough to fix it.

## Develop

```sh
git clone https://github.com/SeanZoR/gmail-otp-fill.git
cd gmail-otp-fill
npm install
npm test        # code-extraction and matching tests
npm run lint
npm run build   # dist/gmail-otp-fill-<version>.zip
```

Load the folder at `chrome://extensions` with **Load unpacked**. After you change code, click the ↻ icon on the extension.

To try the chip without Gmail, run `python3 -m http.server` in the repo and open `http://localhost:8000/test/fixture.html`. Add `?auto` to test auto-paste. The page stubs the extension's messaging.

## Where things live

| File | Job |
|---|---|
| `extract.js` | Pure functions: find the code in an email, match sender to site, DMARC and link checks. Unit-tested. |
| `background.js` | OAuth and Gmail API calls. Picks the best code for a page. |
| `content.js` | Spots code fields, shows the chip, fills the field. |
| `popup.*`, `options.*` | Toolbar popup and setup page. |

## Rules for changes

- **Security rules don't get looser without a test and an argument.** Read [SECURITY.md](SECURITY.md) first.
- **Every new email format or site gets a test** in `test/extract.test.mjs`.
- **No new permissions** unless the PR explains why.
- **No network calls** except to Google.
- Add a line to `CHANGELOG.md` under **Unreleased**.

## Releasing (maintainers)

1. Move the **Unreleased** notes in `CHANGELOG.md` to a new version heading.
2. Bump `version` in both `manifest.json` and `package.json`.
3. Commit, then `git tag vX.Y.Z && git push --tags`. The release workflow runs the tests, builds the zip and publishes the release.
