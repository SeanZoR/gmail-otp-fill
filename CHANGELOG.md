# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Until 1.0, minor versions may change behaviour.

## [Unreleased]

## [0.2.0] - 2026-09-27

### Added
- **Auto-paste on an exact match.** The code goes straight into the field when the sender's domain matches the site, Gmail's DMARC check passes, and the page is the main domain or a subdomain the email links to. An **Undo** notice shows for 8 seconds. It never presses Submit. You can turn it off in Options.
- Toolbar popup shows the sender's domain and warns when it doesn't match the open tab.
- CI (lint, tests, version check, zip build) and tagged releases with a ready-to-load zip.
- SECURITY.md, PRIVACY.md, CONTRIBUTING.md, a step-by-step setup guide, and issue templates.

### Changed
- **The chip appears only for a matching sender domain with DMARC pass.** Other codes are in the popup only. This blocks phishing-relay pages.
- Removed brand-name matching, which let `stripe.help` pass for Stripe.
- Pinned the extension ID, so the OAuth redirect URI is the same for everyone.

## [0.1.0] - 2026-09-27

### Added
- First version: spot code fields, read recent Gmail (read-only), click-to-paste chip, toolbar popup, bring-your-own OAuth client.

[Unreleased]: https://github.com/SeanZoR/gmail-otp-fill/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/SeanZoR/gmail-otp-fill/releases/tag/v0.2.0
[0.1.0]: https://github.com/SeanZoR/gmail-otp-fill/commit/9b18879
