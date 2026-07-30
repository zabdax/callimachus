# HSC Crackers — Study Tracker (v1.0)

A clean-room PWA for Bangladeshi HSC students: focus timer, batch-aware pace card, spaced-repetition, daily plan, bKash subscription review, BN/EN i18n.

> **Status:** Plan 1 (Foundation + Profile + Syllabus) implementation in progress. See [the plan index](docs/superpowers/plans/2026-07-29-README.md).

## Architecture

Monorepo layout:

```
.
├── apps/
│   ├── web/         Vite + React 18 + TS PWA (deploy to Firebase Hosting)
│   └── functions/   Firebase Cloud Functions Gen 2 (TypeScript)
├── firestore.rules  Security rules (deployed to Firebase)
├── firebase.json    Hosting + Functions + Firestore wiring
├── .github/         CI workflows
└── docs/            Design spec + implementation plans
```

## Quick start

```bash
# install workspaces
cd apps/web && npm install
cd ../functions && npm install

# web
cd ../web
cp .env.example .env   # fill in VITE_FIREBASE_* keys
npm run dev            # http://localhost:5173

# functions
cd ../functions
npm run serve          # Firebase emulator (Firestore + Functions)
```

## Scripts

| Where | Script | What |
|---|---|---|
| `apps/web` | `npm run dev` | Vite dev server |
| `apps/web` | `npm run build` | TypeScript check + Vite build |
| `apps/web` | `npm test` | Vitest unit + component |
| `apps/web` | `npm run test:rules` | `@firebase/rules-unit-testing` |
| `apps/web` | `npm run test:e2e` | Playwright (after `npx playwright install`) |
| `apps/web` | `npm run lint` | ESLint |
| `apps/web` | `npm run seed:batches` | Seed `/batches/HSC-2024` … `/batches/HSC-2030` |
| `apps/functions` | `npm run build` | TypeScript → `lib/` |
| `apps/functions` | `npm run serve` | Build + start emulator |
| `apps/functions` | `npm test` | Vitest |

## Docs

- **Design spec** — `docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md`
- **Plan index** — `docs/superpowers/plans/2026-07-29-README.md`
- **Plan 1 (this milestone)** — `docs/superpowers/plans/2026-07-29-foundation-and-profile-plan.md`
- **Plan 2 (next)** — `docs/superpowers/plans/2026-07-29-timer-and-progress-plan.md`
- **Plan 3 (final)** — `docs/superpowers/plans/2026-07-29-subscription-admin-and-ship-plan.md`

## Quality bars

- 80% line coverage on `apps/web/src/lib/` and `apps/web/src/features/*`
- 100% of Firestore rules have positive + negative tests
- All Cloud Functions have at least one happy-path test
- TDD: failing test → implement → green → commit, every task
- Accessibility: Lighthouse ≥ 90, axe-core zero ≥-serious issues
- No secrets in repo (`.env.example` only; CI injects real keys)

## GitHub repo setup

```bash
# from the repo root
scripts/create-github-repo.sh
```

This requires the `gh` CLI and an authenticated session (`gh auth login`). See `scripts/create-github-repo.sh` for details.
