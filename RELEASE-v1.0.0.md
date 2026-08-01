# HSC Crackers v1.0.0 — 2026-08-01

First public release. The app is **feature-complete** for the v1.0 spec:
students can sign in, pick their HSC batch, mark syllabus chapters, run a
focused study timer that keeps running across tab-switches, see a pace
card + exam countdown + daily plan, and admins can approve bKash
subscription payments.

## What's in the box

### Student features
- Google sign-in + onboarding (medium, batch, college)
- Bangla + English medium-aware syllabus map (4-checkbox grid per chapter)
- Spaced-repetition auto-scheduler (`+7d`, `+14d`, `+30d`)
- Focus timer anchored on `Date.now()` deltas — **never pauses on tab-switch** (±1s verified by Playwright e2e)
- Server-anchored sessions with presence nonces + offline queue + replay
- BST-midnight session splits for accurate daily analytics
- PaceCard (Recharts radial) + ExamCountdown + DailyPlanCard
- Time-block timeline (06:00–23:00) with add/complete CRUD
- Community leaderboard with 15-min/day rank gate
- Bangla + English UI (full coverage, no English placeholders in `bn.json`)
- PWA: installable, offline fallback, Workbox runtime cache
- Sentry error reporting
- Dark / Light / Auto theme switcher
- Data export (JSON) + account deletion (Cloud Function, batched)

### Subscription + Admin
- 4 Pro plans (1m / 3m Popular / 6m Best Value / 12m) at ৳50 / ৳140 / ৳270 / ৳500
- bKash TrxID + screenshot upload via 5-min signed URL (image/* only)
- `paymentRequests` Firestore rules (owner create-only, no client update/delete)
- Admin gate via `/admins/{uid}` + Firebase Auth custom claim
- Approval queue UI at `/admin/approvals`
- `approvePayment` Cloud Function (admin-only) sets `users.subscription`, marks PR approved, writes `audit` log
- Bootstrap-admin script (`scripts/bootstrap-admin.mjs`) + runbook (`docs/admin-bootstrap.md`)

### Quality
- **136 vitest tests across 52 files** in `apps/web` (rules unit tests use the Firebase rules-unit-testing harness)
- **25 vitest tests across 10 files** in `apps/functions`
- **8 scripts tests** in `scripts/` (admin bootstrap + deploy env)
- **4 Playwright e2e specs** (`timer-persistence`, `public-routes` × 3)
- Lint clean, both apps build clean, Workbox SW generated
- TDD throughout (failing test → implementation → passing test → commit)

### CI
- `build-test` job: lint + vitest + build on every PR
- `e2e` job: Playwright suite gated on `build-test` success (needs `VITE_FIREBASE_*` secrets)
- `lighthouse` job: runs on `main` pushes only; gates on ≥90 for performance / accessibility / PWA

### Deploy
- `scripts/deploy.mjs` validates required env, builds both apps, runs `firebase deploy`
- See `docs/admin-bootstrap.md` for the one-time admin promotion runbook

## Known gaps (deferred to v1.0.1)

These are tracked in `docs/superpowers/plans/HANDOFF.md` and do not block shipping:
1. **Real Google OAuth client ID** — Plan 1 wired the popup stub; production keys must be set in `.env.production` before launch.
2. **`chapterId` threading** — `ChapterPicker` collects the chapter but the `chapterId` is not yet sent in `processStudySession` payload. (Plan 4 work.)
3. **`sendRevisionReminder` integration test** — only the pure builder is unit-tested; the scheduled function needs an emulator-based integration test.
4. **PWA icons** are now generated (Cool Slate + white circle) — replace with branded artwork before public launch.
5. **Sentry real DSN** — placeholder `.env.production.example` lists all 8 required keys; populate from the Sentry project before launch.

## Stats

- **Days from design spec to first release**: 3
- **Lines of TypeScript**: ~12k (apps/web) + ~1.5k (apps/functions) + ~300 (scripts/)
- **Total commits on `main`**: 53 since the design spec was committed
- **Open feature flags**: 0 (every shipped feature is on)

## Thanks

To every subagent that rate-limited out and every test that failed three
times before passing. The handoff doc at
`docs/superpowers/plans/HANDOFF.md` is the source of truth for "what
shipped, what's deferred, and how to roll back."

— Zubayer Hasan Shaad, on behalf of the HSC Crackers build