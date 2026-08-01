# PRIVATE — what is **not** in this public repo

This repository is a public **template**. Several real-world assets are
intentionally excluded. The list below is a contract: keep these things
out of git history, out of issues, and out of public PRs.

---

## What this repo does NOT contain

| Kind | Where it actually lives |
|---|---|
| Real Firebase project IDs, API keys, app IDs | env vars on the maintainer's machine + GitHub Actions secrets |
| Firebase service-account JSON | `~/.config/callimachus/sa.json` (the gitignore blocks `**/firebase-adminsdk-*.json`) |
| bKash app key / secret / username / password | maintainer-only password manager; never committed |
| Sentry DSN for the production project | GitHub Actions secret only |
| Production `apps/web/.env.production` | gitignored; created locally and on the deploy host |
| Production seed snapshots of real users / payment screenshots | not stored anywhere readable from this repo |
| Internal roadmap docs that name real partners / pricing | stay in the maintainer's private notes |

## What you can safely do as a contributor

- Add code, tests, doc edits.
- Touch `apps/web/.env.example` and `.env.production.example` (placeholders only).
- Edit `firebase.json`, `firestore.rules`, `storage.rules`, `apps/functions/**`, `apps/web/src/**`.

## What you must never do

- Commit a `.env` file with real values.
- Paste a service-account JSON, even temporarily, into `apps/web/public/`.
- Reference the real Firebase project ID in code, comments, or screenshots.
- Post screenshots of production data in issues or PRs.

## If you accidentally commit a secret

1. Rotate the credential immediately (assume it is leaked).
2. Open a low-trust issue only on the maintainer's private tracker, **not** a PR.
3. We rewrite history (BFG / `git filter-repo`) and force-push.

The repo's `.gitignore` rejects common patterns by default. If you find a
case it does not catch, please open an issue (no real secrets, just the
file path and what was missed).

## Maintained by

The Callimachus maintainers. Open a public issue for anything unrelated
to secrets; otherwise use the private contact channel listed on the
maintainer's GitHub profile.
