# HSC Crackers

A focused, bilingual HSC study tracker. Students plan revision, track study sessions, manage spaced-repetition tasks, and request subscriptions with a bKash TrxID.

## Stack

| Layer | Choice |
|---|---|
| Web app | Vite, React, TypeScript, Tailwind, PWA |
| Server API | Cloudflare Workers + Hono |
| Auth and data | Firebase Auth + Cloud Firestore |
| Cache | Cloudflare KV |
| Monitoring | Optional Sentry browser SDK |
| Tests | Vitest, Firestore Rules Unit Testing, Playwright |

## Architecture

The web app is deployed to Cloudflare Pages. It calls the Cloudflare Worker for protected server actions such as study-session submission, payment approval, and account-data export. Firebase Auth supplies ID tokens and Cloud Firestore stores user data behind security rules.

This is a **TrxID-only** payment flow. The product does not collect payment screenshots or use Cloud Storage/R2 for payments.

## Repository layout

```text
apps/web/       React PWA
apps/workers/   Cloudflare Worker API
scripts/        deployment and local admin helpers
firestore.rules Firestore access policy
firebase.json   Firestore rules/index configuration
```

## Local development

```bash
(cd apps/web && npm ci && npm run dev)
(cd apps/workers && npm ci && npm run dev)
```

Copy `apps/web/.env.production.example` to a local `.env.production` only when preparing a production-like build. It is intentionally gitignored.

## Quality checks

```bash
(cd apps/web && npm run lint && npm test && npm run build)
(cd apps/workers && npm test && npm run build)
(cd apps/web && npm run test:rules)
```

Run browser tests after installing Playwright’s browser:

```bash
(cd apps/web && npx playwright install chromium && npm run test:e2e)
```

## Deployment

The deployment script builds the web and Worker apps, deploys Cloudflare Pages/Workers, then deploys Firestore rules and indexes:

```bash
node scripts/deploy.mjs
```

It requires Cloudflare and Firebase credentials plus the public Vite/Firebase configuration as environment variables. Do not commit credentials, real `.env.production` files, service accounts, or access tokens.

Before a real deploy, verify these dashboard settings manually:

- Firebase Auth authorized domains include the Pages/custom web domain.
- Worker `ALLOWED_ORIGINS` includes the exact web origin.
- Worker secret `FIREBASE_ACCESS_TOKEN` is valid and least-privileged.
- App Check and Sentry are either fully configured or deliberately disabled.

## Security

Do not file public issues for security bugs. See [SECURITY.md](./SECURITY.md) for the reporting process.
