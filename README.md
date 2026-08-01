<div align="center">

```
   ____      _ _ _                               _
  / ___|__ _| | | |_ __ _   _ ___  __ _  ___ _ __| |
 | |   / _` | | | __/ _` | | / __|/ _` |/ _ \ '__| |
 | |__| (_| | | | || (_| | | \__ \ (_| |  __/ |  | |
  \____\__,_|_|_|\__\__,_| | |___/\__,_|\___|_|  |_|
                                  |___/
```

# Callimachus

**A clean-room study tracker PWA for Bangladeshi HSC students.**

Focus timer that survives tab-switches. Batch-aware pace card.
Spaced repetition. Daily plan. BN / EN. PWA installable.

[![CI](https://img.shields.io/badge/CI-passing-2ea44f?style=for-the-badge)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![Node 20](https://img.shields.io/badge/node-20_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-ready-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=for-the-badge)](apps/web/public/manifest.webmanifest)
[![Coverage target](https://img.shields.io/badge/coverage-80%25-brightgreen?style=for-the-badge)](docs/superpowers)

[Quick start](#-quick-start) • [Stack](#-stack) • [Layout](#-layout) • [Docs](#-docs) • [Contribute](#-contribute) • [License](#-license)

</div>

---

## About

Callimachus is named after the ancient Greek scholar who curated the
Library of Alexandria. The app helps a Bangladeshi HSC (Higher Secondary
Certificate) student plan a study year, focus through it, and review on a
schedule.

It is **not** a fork of any existing product. The syllabus data, copy,
and code are re-authored from scratch. The original inspiration is
credited only at the level of "an HSC study tracker exists; we wrote
ours."

## Features

- Focus timer that does not pause on tab-switch (uses `performance.now`
  with a service-worker aware offset).
- Pace card that adapts to the user's HSC batch (`HSC-2024` through
  `HSC-2030`).
- Spaced-repetition scheduler (Cloud Function) with revision reminders.
- Time-blocked daily plan.
- Bangla and English (Bangla is the primary locale).
- "Cool Slate" focus palette, dark by default, designed for long reading
  sessions.
- Admin review queue for manually approved bKash subscription requests.
- PWA installable, Lighthouse-friendly.

## Screenshots

> Real screenshots will live here once the maintainer attaches them to the
> first release. Placeholders use ASCII so the README renders on a
> terminal too.

```
+--------------------------+    +--------------------------+
|  pace card               |    |  timer                   |
|  HSC-2026  186 days left |    |       24:13              |
|  exam  2026-06-30        |    |  [ pause ]  [ stop ]     |
|  syllabus 42% complete   |    |                          |
+--------------------------+    +--------------------------+
```

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 18 + TypeScript | fast HMR, small bundles, strict types |
| Styling | Tailwind + custom "Cool Slate" tokens | composed palettes, dark first |
| i18n | `react-i18next` + ICU messages | Bangla primary, easy translation files |
| Tests | Vitest + Testing Library + Playwright | unit, component, e2e, all green on CI |
| Rules | `@firebase/rules-unit-testing` | positive + negative tests for every rule |
| Backend | Firebase Cloud Functions Gen 2 (TS) | scheduled + callable, no extra ops |
| Auth | Firebase Auth (Google provider) | low friction, custom claims for admin |
| DB | Cloud Firestore (production mode) | real-time, rules-based access control |
| Storage | Cloud Storage for payment screenshots | signed URLs only |
| Observability | Sentry (web SDK) | source maps via `@sentry/vite-plugin` |

## Layout

```
callimachus/
+-- apps/
|   +-- web/             Vite + React 18 + TS PWA
|   +-- functions/       Firebase Cloud Functions Gen 2 (TS)
+-- scripts/             Deploy + admin helpers (env-only, no secrets)
+-- firestore.rules      Deployed to Firebase
+-- storage.rules        Deployed to Firebase
+-- firebase.json        Hosting + Functions + Firestore + Storage wiring
+-- .github/
|   +-- workflows/       CI: build-test, e2e (Playwright), lighthouse
|   +-- ISSUE_TEMPLATE/  Bug report + feature request
|   +-- PULL_REQUEST_TEMPLATE.md
+-- docs/
|   +-- superpowers/     Design specs and implementation plans
|   +-- admin-bootstrap.md
+-- LICENSE              MIT
+-- CONTRIBUTING.md      PR rules, style, ground rules
+-- SECURITY.md          How to report a vulnerability (privately)
+-- PRIVATE.md           What this public repo does NOT contain
+-- SETUP.md             Bring up a working copy from a clean clone
+-- README.md            You are here
```

## Quick start

```bash
# 1. install workspaces
( cd apps/web       && npm ci )
( cd apps/functions && npm ci )
( cd scripts        && npm ci )

# 2. fill in env files (placeholders only, no real keys)
cp apps/web/.env.example              apps/web/.env
cp apps/web/.env.production.example   apps/web/.env.production

# 3. run the web app
( cd apps/web && npm run dev )
# open http://localhost:5173

# 4. run the Cloud Functions emulator (separate terminal)
( cd apps/functions && npm run serve )
```

A complete, step-by-step setup (Firebase project, service account, App
Check, deploy) lives in [SETUP.md](./SETUP.md).

## Scripts

| Where | Script | What it does |
|---|---|---|
| `apps/web` | `npm run dev` | Vite dev server with HMR |
| `apps/web` | `npm run build` | TypeScript check + Vite build |
| `apps/web` | `npm test` | Vitest unit + component |
| `apps/web` | `npm run test:rules` | `@firebase/rules-unit-testing` |
| `apps/web` | `npm run test:e2e` | Playwright (after `npx playwright install`) |
| `apps/web` | `npm run lint` | ESLint |
| `apps/web` | `npm run seed:batches` | Seed `/batches/HSC-2024` ... `/batches/HSC-2030` |
| `apps/functions` | `npm run build` | TypeScript -> `lib/` |
| `apps/functions` | `npm run serve` | Build + start emulator |
| `apps/functions` | `npm test` | Vitest |
| `scripts/` | `node deploy.mjs` | Validate env and deploy |
| `scripts/` | `node bootstrap-admin.mjs <uid>` | Promote a user to admin |

## Quality bars

- `>= 80%` line coverage on `apps/web/src/lib/` and `apps/web/src/features/*`
- 100% of Firestore rules have positive + negative tests
- Every Cloud Function has at least one happy-path test
- TDD discipline: failing test -> implementation -> green -> commit
- Accessibility: Lighthouse `>= 90` for performance, accessibility, PWA
- Zero secrets in the repo (placeholders only; `.env.example` files)

## Docs

- Design spec: `docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md`
- Plan index: `docs/superpowers/plans/2026-07-29-README.md`
- Admin bootstrap: `docs/admin-bootstrap.md`
- Private-exclusion contract: `PRIVATE.md`
- Setup from zero: `SETUP.md`

## Contribute

PRs welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. The CI
workflow (`.github/workflows/ci.yml`) must be green before merge. Branch
protection on `main` requires at least one approving review and the
`build-test` check.

Good first issues are tagged `good first issue` and usually involve a
missing translation string, a missing tests rule case, or a small UX
fix.

## Security

Please do not file security issues publicly. Follow
[SECURITY.md](./SECURITY.md) for the private disclosure channel.

## License

[MIT](./LICENSE). Copyright Callimachus Contributors.

<div align="center">

```
        *  studying is the slow work of becoming.  *
```

</div>
