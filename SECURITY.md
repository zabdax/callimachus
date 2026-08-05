# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `main` branch | yes |
| Tagged releases (`v*`) | yes, latest minor only |
| Older branches | best-effort |

Callimachus is a single-environment PWA; there is no long-term support
window. Security fixes land on `main` first.

## Reporting a vulnerability

**Please do not file a public issue for security bugs.**

Use GitHub's private vulnerability-reporting feature for this repository.
If it is not enabled yet, contact the repository owner privately and do not
include exploit details in a public issue. Enable a monitored security email
before publishing a public contact address.

Include:

- A short description of the issue and impact.
- Reproduction steps or a proof-of-concept.
- The commit hash or release tag, if known.

We aim to acknowledge reports within 72 hours and ship a fix or
workaround within 14 days, depending on severity.

## What counts as a security issue here

- Auth bypass (a user reading or writing data they should not).
- Rules misconfiguration that exposes another user's Firestore doc.
- Cloud Function that accepts arbitrary external input and trusts it.
- App Check bypass.
- XSS / open-redirect in the SPA.
- Anything that leaks the production Firebase project layout.

## Out of scope

- Denial-of-service against `study-tracker-hsc.web.app` (the unrelated
  original product this was inspired by).
- Spam reports from bots. We close those without action.

## Hall of fame

We thank reporters who follow this policy. Names are added (with
consent) after the fix ships.

## See also

- `PRIVATE.md` for what is **not** in this public repo.
- `CONTRIBUTING.md` for PR rules.
