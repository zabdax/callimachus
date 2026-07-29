# HSC Study Tracker — v1.0 Implementation Plan (Orientation)

> **Status:** Orientation only. The executable TDD plans live in three sub-plan files. Read this first, then read the sub-plan for the milestone you are starting.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement these plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.0 of a Bangladeshi HSC study-tracker PWA — clean-room re-implementation of `study-tracker-hsc.web.app` with: focus timer that does NOT pause on tab-switch, batch-aware dynamic pace card, spaced-repetition scheduler, daily-plan time-blocking, BN/EN i18n, "Cool Slate" focus palette, manual bKash payment review, admin dashboard, PWA installability.

**Design spec (source of truth):** `F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md`
**Plan index (tech stack, quality bars):** `F:\Studytracker\docs\superpowers\plans\2026-07-29-README.md`
**Handoff (session context, prior failures):** `F:\Studytracker\docs\superpowers\plans\HANDOFF.md`

---

## Sub-plans (execute in order)

| # | Sub-plan | Milestones | Ship after this plan | Est. effort |
|---|---|---|---|---|
| 1 | [`2026-07-29-foundation-and-profile-plan.md`](./2026-07-29-foundation-and-profile-plan.md) | M1 + M2 + M3 | Vite+React+TS app boots, Google sign-in works, onboarding picks medium + batch + college, syllabus map renders, manual tasks work, SR auto-creates upcoming tasks. | ~5 weeks |
| 2 | [`2026-07-29-timer-and-progress-plan.md`](./2026-07-29-timer-and-progress-plan.md) | M4 + M5 | Focus timer persists across tab-switch with ±1 s accuracy, pace card shows correct batch-aware percentages, daily-plan time-blocking UI ships, community leaderboard reads work. | ~4 weeks |
| 3 | [`2026-07-29-subscription-admin-and-ship-plan.md`](./2026-07-29-subscription-admin-and-ship-plan.md) | M6 + M7 + M8 | Subscription + admin approval, BN/EN i18n, FCM notifications, chapter-tagging, data export, accessibility + perf audit, Playwright e2e, PWA manifest, privacy policy, marketing page. **v1.0 ships.** | ~6 weeks |

**Total v1.0 estimate:** ~15 weeks single full-time developer (±20%).

---

## Scope-bound decisions (locked — do not re-open during execution)

These were called out as "open questions" in earlier drafts and are now resolved:

- **Package manager:** **npm**. Avoids pnpm-specific issues with Firebase CLI; consistent with Firebase ecosystem docs.
- **Plan tiers (M6):** **4 tiers** — 1 m ৳50, 3 m ৳140 (Popular), 6 m ৳270 (Best Value), 12 m ৳500. Spec §1.3 says ৳50/mo or ৳500/year; the 3 m and 6 m tiers are standard HSC-prep coaching pricing in Bangladesh and are kept.
- **Syllabus data:** **Re-typed, not scraped.** 13 subjects × 2 mediums. Plan 1 ships schema + 1 worked example (Physics 1st Paper, Bangla medium, ~12 chapters) so the loader is fully tested; remaining 12 subjects + English medium variants are mechanical fills in a single Plan 1 task.
- **Batch dates:** **Placeholder**, marked as such in the seed script. Admin must verify against Bangladesh Education Board schedule before public launch. Plan 1 ships the seeder and a one-task verification gate.
- **i18n:** **From Plan 1, Task 2.** Every UI string is a `t()` call from day 1. Plan 3 swaps real Bangla translations in via `bn.json`; Plan 1 ships `en.json` complete + a stub `bn.json` with the same key set.
- **Package layout:** `apps/web/`, `apps/functions/`, `apps/firestore/`, `firestore.rules`, `storage.rules` at repo root. No `packages/` yet — Capacitor is v1.1.
- **Pace card color states:** 4 — `pre-start` (countdown to college start), `in-session` (countdown to exam), `exam-window` (countdown to last exam), `resulted` (celebratory).
- **Anti-cheat nonces:** Server-issued every 5–15 min via Cloud Scheduler trigger (not a separate scheduled function — single cron, randomized inside).

---

## What is explicitly NOT in v1.0 (locked — do not add mid-execution)

- Native iOS app.
- Mock-test / MCQ engine.
- AI study assistant / LLM features.
- B2B coaching institute plan.
- Social features (follow, comments, posts).
- **WhatsApp daily digest** — listed in spec §7.4 but **deferred to v1.1** because WABA verification takes 1–4 weeks. v1.0 uses FCM + email digest.
- Marketing-page copy and design polish beyond the layout in Plan 3 Task 5.

If a task is needed that is not in any of the three sub-plans, **add a task there with a one-line justification in the commit message**. Do not let "while I'm here" work drift scope.

---

## Quality bars (must hold across all three sub-plans)

- [ ] **80% line coverage** on `apps/web/src/lib/` and `apps/web/src/features/*` (UI is best-effort).
- [ ] **100% of Firestore rules** have positive + negative tests via `@firebase/rules-unit-testing`.
- [ ] **All Cloud Functions** have at least one happy-path integration test against the Firestore emulator.
- [ ] **TDD discipline** — every task writes the failing test BEFORE the implementation.
- [ ] **Frequent commits** — each task ends with a `git commit` step; never bundle multiple tasks into one commit.
- [ ] **Accessibility** — Lighthouse Accessibility ≥ 90; axe-core reports zero ≥-serious issues on every screen.
- [ ] **No secrets in repo** — all Firebase + Sentry keys via `.env` (committed `.env.example` only); CI injects real keys.

---

## Verification plan (continuous)

- `npm run test` — Vitest unit + integration (80% line coverage on lib + features).
- `npm run test:rules` — `@firebase/rules-unit-testing` (100% rule coverage).
- `npm run test:e2e` — Playwright.
- `npm run lint` — ESLint + Prettier.
- GitHub Actions runs all of the above on every PR + Firebase Hosting preview channel deploy.

### Key regression tests (must exist after Plan 2 / Plan 3)

- **Timer tab-switch:** Start timer, simulate `visibilitychange → hidden` for 60 s, return, assert elapsed = 60 s ±1 s.
- **SR auto-scheduler:** Set `firstStudyDate` on a chapter, verify 3 `upcomingTasks` created at +7 d, +14 d, +30 d.
- **BST midnight split:** Session from 23:30 → 00:30 BST splits into 2 session docs.
- **Overlap detection:** Submit session overlapping the last one, verify rejection.
- **Admin authz:** Non-admin calls `approvePayment`, verify rejection.
- **Rank gate:** Today's session < 15 min, leaderboard shows locked state.
- **Pace card batch switch:** Change `batchId` from settings, pace recomputes within 1 s.
- **Payment approval live update:** Admin approves, student sees green "Active" pill without refresh (Firestore listener).

---

## When you're done with all three sub-plans

The acceptance criteria in design spec §16 must all be checked off before tagging v1.0.0.

After v1.0 ships:
- v1.1 = Capacitor Android wrapper + WhatsApp daily digest (`enqueueDailyDigest` Cloud Function).
- v2.0 = B2B coaching institute dashboard + iOS wrapper + (optional) mock-test engine and AI assistant.
