# Contributing to Callimachus

Thanks for your interest in Callimachus. This is a small project with high
standards; we appreciate clean PRs and good test coverage.

## Ground rules

1. **No real credentials**. This repo is a public template. Never commit a
   service-account JSON, a real Firebase project ID, an API key, a bKash
   secret, or a Sentry DSN. See `PRIVATE.md` for what stays private.
2. **TDD where it makes sense**. Public-facing logic in `apps/web/src/lib/`
   and `apps/web/src/features/*` has 80% line coverage as a quality bar.
   Failing test first, then implementation, then green, then commit.
3. **Firestore rules get both directions tested**. Every rule must have a
   positive and a negative test in `apps/web/tests/rules/`.
4. **Cloud Functions need at least one happy-path test**.
5. **No secrets in CI**. Add your secret under Settings → Secrets, never
   in `.github/workflows/*.yml`.

## Local setup

```bash
git clone https://github.com/<your-account>/callimachus.git
cd callimachus
( cd apps/web       && npm ci )
( cd apps/functions && npm ci )
( cd scripts        && npm ci )
```

Then follow `SETUP.md` for the env files and Firebase project setup.

## Workflow

1. Branch off `main`:
   ```bash
   git checkout -b feat/<short-name>
   ```
2. Make small commits with conventional prefixes:
   `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
3. Push and open a PR. The CI workflow (`.github/workflows/ci.yml`)
   must be green before merge:
   - `build-test` — lint + tests + build for both workspaces.
   - `e2e` — Playwright against the test routes.
   - `lighthouse` — runs on `main` after merge; recommended thresholds
     of 90/90/90 for performance / accessibility / PWA.
4. At least one approving review is required (branch protection).

## Style

- TypeScript strict mode is on. No `any` unless there is a comment
  explaining why.
- ESLint config is at `apps/web/.eslintrc.cjs`. Run `npm run lint` from
  each workspace before pushing.
- Prettier is the formatter. Pre-commit hook (`apps/web/.husky/`)
  formats staged files; you do not need to run it manually.

## Translations

The PWA ships Bangla and English. New strings go in:

- `apps/web/src/messages/bn.json`
- `apps/web/src/messages/en.json`

Use ICU message format. If a string needs interpolation, prefer named
placeholders (`{count}`, `{name}`) over positional ones.

## Reporting issues

- Bugs and features: the `.github/ISSUE_TEMPLATE/bug_report.md` and
  `feature_request.md` forms.
- Security: **do not** open a public issue. Email the address in
  `SECURITY.md`.
- Docs typos: open a PR directly.

## Code of conduct

Be kind. We follow the spirit of the Contributor Covenant. Disputes get
escalated to the maintainers; we decide.
