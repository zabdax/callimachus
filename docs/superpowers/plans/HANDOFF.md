# HANDOFF — HSC Study Tracker Build

> **Purpose:** This file contains everything a new agent (or you) needs to write the three implementation plans for the HSC study tracker PWA. Three subagents were dispatched to write the plans in parallel, but all three hit provider rate limits. The plans were NOT written. This handoff consolidates the full session output so nothing has to be re-derived.

---

## 1. Context: what the project is

We're building a clean-room re-implementation of `study-tracker-hsc.web.app` (a Bangladeshi HSC study tracker). It's a PWA, not a fork — we re-author the syllabus data and we own all the code.

**Targets:**
- Bangladeshi HSC students (Class 11–12) preparing for the national exam.
- Bangla + English UI (both at v1.0), Bangla/English medium-aware syllabus.
- Monetization: 7-day free trial + ৳50/month Pro (no ads, single paid tier).
- v1.0 ships as a PWA on Firebase Hosting. Capacitor Android wrapper is v1.1.

**What we are NOT building in v1:**
- Native iOS app.
- Mock-test / MCQ engine.
- AI study assistant / LLM features.
- B2B coaching institute plan.
- Social features.
- WhatsApp daily digest (deferred to v1.1; FCM + email in v1.0).

---

## 2. Files already produced (committed)

| File | Lines | Purpose |
|---|---|---|
| `docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md` | ~660 | Design spec — read this FIRST. 16 sections covering product, stack, architecture, data model, security, UI, features, Cloud Functions, batch system, timer, rollout, testing, risks, acceptance. |
| `docs/superpowers/plans/2026-07-29-README.md` | ~75 | Index of the three plan files (chunks 1, 2, 3) and how to execute them. |

**Repo root:** `F:\Studytracker\`
**Original codebase (read-only reference):** `F:\Studytracker\Study-tracker-copy\` (do not modify)
**Analysis of the original** (in chat history above): file map, module purpose, Firebase data model, security review, strengths/weaknesses.

---

## 3. Plan structure (what the new agent must produce)

The agent must create THREE files, each is a full plan with header + milestones + tasks (TDD, exact code, exact commands, git commit at end of every task):

| File | Milestones | Approx. task count |
|---|---|---|
| `docs/superpowers/plans/2026-07-29-foundation-and-profile-plan.md` | M1 + M2 + M3 | ~25 tasks |
| `docs/superpowers/plans/2026-07-29-timer-and-progress-plan.md` | M4 + M5 | ~18 tasks |
| `docs/superpowers/plans/2026-07-29-subscription-admin-and-ship-plan.md` | M6 + M7 + M8 | ~22 tasks |

Plan format (writing-plans skill — required header):

```markdown
# [Title] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [1 sentence]

**Architecture:** [2-3 sentences]

**Tech Stack:** [bullets]

**Companion docs:**
- Design spec: `F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md`
- Repo root: `F:\Studytracker\`

---

### Task 1: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Test: `tests/exact/path/to/test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// show real code
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- path/to/test.ts`
Expected: FAIL with "X is not defined"

- [ ] **Step 3: Write minimal implementation**

```ts
// show real code
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- path/to/test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: [what]"
```
```

**Granularity rule:** each step is one action (2-5 minutes). 4-6 steps per task. NO placeholders ("TBD", "TODO", "similar to Task N", "add appropriate error handling").

---

## 4. Milestone 1-3 detailed scope (for Plan 1)

**M1 — Project Skeleton**
- Scaffold Vite app: `npm create vite@latest apps/web -- --template react-ts`.
- Add Tailwind: `npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`.
- Configure tailwind with "Cool Slate" palette tokens (see §6.1 of design spec for hex codes).
- Add shadcn/ui: `npx shadcn-ui@latest init`.
- Add ESLint, Prettier, Husky, lint-staged.
- Add Vitest + React Testing Library + Playwright.
- Add Firebase JS SDK (`firebase` package, version 10.x).
- Create Firebase project (separate from the original), set up `.env.example` with `VITE_FIREBASE_*` keys.
- Enable Firebase App Check (reCAPTCHA Enterprise).
- Create Firestore rules scaffold with at least the `users/{uid}` rule from design spec §5.2.
- Add `@firebase/rules-unit-testing` for rules tests.
- GitHub Actions CI workflow: lint → test → build → deploy preview.
- First deploy to Firebase Hosting.
- Tasks: ~10.

**M2 — Auth + Profile + Onboarding + Batch**
- `src/features/auth/AuthContext.tsx` with `useAuth()` hook.
- Google sign-in button using `signInWithPopup(auth, googleProvider)`.
- `requireAuth` and `requireProfile` route guards.
- `/onboarding` route with 3 steps: medium (Bangla/English radio) → batch (HSC-2026 … HSC-2030 picker) → college (text input).
- `users/{uid}` doc write on completion.
- `src/features/batches/` with `recomputeBatchStatus(batch)` pure function + tests.
  - States: `pre-start` (now < collegeStart), `in-session` (collegeStart ≤ now < examStart), `exam-window` (examStart ≤ now ≤ examEnd), `resulted` (now > examEnd).
- `scripts/seedBatches.mjs` — seeds `/batches/HSC-2024` … `/batches/HSC-2030` with placeholder dates (must verify against Bangladesh Education Board schedule before launch).
- Placeholder dates (verify before launch):
  | batchId | collegeStart | examStart | examEnd | resultDate |
  |---|---|---|---|---|
  | HSC-2024 | 2023-07-15 | 2024-06-30 | 2024-08-15 | 2024-10-15 |
  | HSC-2025 | 2024-07-15 | 2025-06-30 | 2025-08-15 | 2025-10-15 |
  | HSC-2026 | 2025-07-15 | 2026-06-30 | 2026-08-15 | 2026-10-15 |
  | HSC-2027 | 2026-07-15 | 2027-06-30 | 2027-08-15 | 2027-10-15 |
  | HSC-2028 | 2027-07-15 | 2028-06-30 | 2028-08-15 | 2028-10-15 |
  | HSC-2029 | 2028-07-15 | 2029-06-30 | 2029-08-15 | 2029-10-15 |
  | HSC-2030 | 2029-07-15 | 2030-06-30 | 2030-08-15 | 2030-10-15 |
- Tasks: ~8.

**M3 — Syllabus + Tasks + Spaced Repetition**
- Seed `/syllabus/bangla/{subjectId}` and `/syllabus/english/{subjectId}` — re-author from the original data (re-type, not scrape). Subjects: physics1, physics2, chem1, chem2, biology1, biology2, hmath1, hmath2, bangla1, bangla2, eng1, eng2, ict.
- `src/features/syllabus/loadAllSyllabus(uid)` + `getTrackedSubjects()` + `saveTrackedSubjects()` + `clearAllSyllabusProgress()`.
- `src/features/syllabus/nextTypeFor(subjectId, chapterName)` — returns `'firstStudy' | 'firstRevision' | 'secondRevision' | 'thirdRevision' | null` based on completed stages.
- `src/features/syllabus/subjectCompletion(subjectId)` — returns `{ firstStudy, firstRevision, secondRevision, thirdRevision }` as percentages.
- `SyllabusMap.tsx` — subject chip tabs + 4-checkbox grid per chapter (1st Study, 1st Rev, 2nd Rev, 3rd Rev).
- `src/features/tasks/upcomingTasks.ts` — `getUpcomingTasks`, `setUpcomingTask`, `completeUpcomingTask`.
- `useSpacedRepetition()` hook — watches syllabus changes; when `firstStudyDate` is set on a chapter, creates three `upcomingTasks` (1st Rev at +7d, 2nd Rev at +14d, 3rd Rev at +30d).
- Tests: `nextTypeFor.test.ts`, `subjectCompletion.test.ts`, `spacedRepetition.test.ts` (use fake timers).
- Tasks: ~7.

---

## 5. Milestone 4-5 detailed scope (for Plan 2)

**M4 — Focus Timer that does NOT pause on tab-switch/minimize**
- `src/features/timer/useTimer.ts` — state machine: `idle | running | paused`, anchored on `Date.now()` deltas (NOT setInterval tick counts). Persists `startTs` and `pausedAccumMs` to Firestore (`users/{uid}/activeSession/current`) and localStorage.
- `src/features/timer/TimerUI.tsx` — circular SVG ring, breathing animation, "Welcome back" toast when tab becomes visible after >5s absence.
- `src/features/timer/serverAnchor.ts` — calls `sessionStart` callable on Start; server returns `serverStartTs`. On Stop, send `{ clientStartTs, clientEndedTs, serverStartTs }` to `processStudySession`.
- `src/features/timer/offlineQueue.ts` — IndexedDB wrapper (use `idb` package). If `processStudySession` call fails, queue the session record; replay on `online` event.
- `visibilitychange` and `blur` listeners ONLY re-render the UI from `(now - startTs) - pausedAccumMs`; they do NOT pause.
- Cloud Function `sessionStart` (callable, Gen 2, TypeScript):
  ```ts
  export const sessionStart = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
    const serverStartTs = Date.now();
    await db.doc(`users/${request.auth.uid}/activeSession/current`).set({
      serverStartTs, clientStartTs: request.data.clientStartTs, createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { serverStartTs };
  });
  ```
- Cloud Function `processStudySession` (callable):
  - Validate: `durationSec` between 10 and 21600, no overlap with last session (10s grace), daily count < 10, presence nonce count ≥ expected for the duration.
  - Split session by BST midnight (write one doc per local day).
  - Update `/analytics/leaderboard_daily/{YYYY-MM-DD}` atomically (use `FieldValue.increment`).
  - If `chapterId` present, update `users/{uid}/chapterStats/{chapterId}` with `FieldValue.increment('totalSec', durationSec)`.
  - Return `{ ok: true, sessionIds }`.
- Cloud Function `presenceNonce` (callable) — returns a 60s-lived nonce; client must echo it back during the session via heartbeat.
- Cloud Function `emitNonce` (scheduled, every 60s) — picks random active sessions and writes a nonce into `/users/{uid}/activeSession/current/pendingNonces/{nonceId}`.
- Playwright e2e: start timer, switch tab for 60s, return, assert elapsed is 60s ±1s.
- Unit tests:
  - `tests/features/timer/dateNowDelta.test.ts` — simulate throttling by setting startTs to now-3600s and assert elapsed returns 3600s.
  - `tests/features/timer/offlineQueue.test.ts` — queue 3 sessions, simulate offline then online, assert all replayed.
  - `tests/features/timer/bstMidnightSplit.test.ts` — session from 23:30 to 00:30 splits into two docs.
- Tasks: ~10.

**M5 — Progress + Daily Plan + Leaderboard**
- `src/features/progress/pace.ts` — pure functions:
  - `pacePct(now, batch)`: `(now - collegeStart) / (examStart - collegeStart) * 100`, clamped [0,100].
  - `remainingDays(now, batch)`: `max(0, ceil((examStart - now) / 86400000))`.
  - `forecastFinishDate(pace, syllabus)` — given current 30-day avg hours/day + remaining syllabus work, project finish date.
- `src/features/progress/PaceCard.tsx` — Recharts `<RadialBarChart>` showing pace % with 4 color states (pre-start / in-session / exam-window / resulted).
- `src/features/progress/ExamCountdown.tsx` — big number "**N days to HSC exam**", color-coded.
- `src/features/dailyPlan/DailyPlanCard.tsx` — list of today's planned blocks.
- `src/features/dailyPlan/TimeBlockTimeline.tsx` — vertical hour timeline (06:00 → 23:00) with draggable blocks; click empty slot to add a block.
- `src/features/dailyPlan/addBlock(uid, { subjectId, chapterId, startHour, durationMin })` — writes to `users/{uid}/meta/timeBlocks/{blockId}`.
- `src/features/dailyPlan/completeBlock(uid, blockId)` — sets `completedAt`.
- `src/features/leaderboard/useLeaderboard.ts` — TanStack Query hook reading `/analytics/leaderboard_daily/{YYYY-MM-DD}` and `/analytics/leaderboard_monthly/{YYYY-MM}`.
- `src/features/leaderboard/RankGate.tsx` — if today's session < 15 min, show "🔒 Study {N}m more to unlock" instead of rank.
- Cloud Function `generateDailyPlan` (scheduled, every day at 05:00 Asia/Dhaka timezone):
  - For each user, read pending `upcomingTasks`, sort by `scheduledFor`, pick the top 4 that fit in 4 hours.
  - Write to `users/{uid}/meta/dailyPlan`.
- Cloud Function `rollUpLeaderboards` (scheduled, every hour):
  - Read today's `/analytics/leaderboard_daily/{YYYY-MM-DD}`.
  - Roll `users` map and `totalDurationSec`, `activeUserCount`, `topRecordSec`, `top10` into `/analytics/leaderboard_monthly/{YYYY-MM}` using `FieldValue.increment`.
  - Prune `users` map entries from daily docs older than 30 days.
- Tests: pace math (boundary cases — exactly at collegeStart, exactly at examStart, post-exam), forecast, daily plan picker, leaderboard sort.
- Tasks: ~8.

---

## 6. Milestone 6-8 detailed scope (for Plan 3)

**M6 — Subscription + Admin**
- `src/features/subscription/Plans.tsx` — 4 plan cards: 1m ৳50, 3m ৳140 (Popular), 6m ৳270 (Best Value), 12m ৳500.
- `src/features/subscription/SubscribeForm.tsx` — plan picker → file upload → optional TRX input → submit.
- `src/features/subscription/PaymentHistory.tsx` — read `paymentRequests` where `uid == currentUser.uid`, sorted by `createdAt desc`. Show status pills.
- Cloud Function `generateSignedUploadUrl` (callable):
  - Returns `{ url, path }` where `path = paymentRequests/{uid}/{uuid}.jpg`.
  - URL expires in 5 min (`expires: Date.now() + 5*60*1000`).
  - Content-type restricted to `image/*`.
- Cloud Function `approvePayment` (callable, requires `request.auth.token.admin === true`):
  - Set `users/{uid}.subscription = { status: 'active', plan, expiresAt: now + planMonths * 30 days, paymentRequestId }`.
  - Write `/audit/{id}` with `{ actor, action: 'approve_payment', target: paymentRequestId, before, after, at }`.
  - Send SMS via SSL Wireless (mocked for v1.0; real keys in v1.1).
- `src/features/admin/ApprovalQueue.tsx` — list `paymentRequests` where `status == 'pending'`, ordered by `createdAt`. Each row has screenshot preview + Approve/Reject buttons.
- `src/features/admin/ScreenshotViewer.tsx` — modal showing the full image + zoom.
- `src/features/admin/BatchManager.tsx` — table of `/batches/{batchId}` docs with edit modal; calls `recomputeBatchStatus` after save.
- `src/features/admin/AuditLog.tsx` — read `/audit` ordered by `at desc`, paginated.
- `src/features/admin/CohortDashboard.tsx` — for a selected batch, show: total students, avg hours, top 10, completion %.
- Firestore rules additions for `/paymentRequests`, `/admins`, `/audit` (see design spec §5.2).
- Tests: subscription flow, admin authz (non-admin gets rejected), signed URL expiry.
- Tasks: ~8.

**M7 — Differentiators + i18n**
- `src/i18n/` — `i18next`, `react-i18next`, `@formatjs/intl`.
- `src/i18n/messages/bn.json` + `src/i18n/messages/en.json` — full translations of every UI string. Use ICU MessageFormat for plurals (e.g. `{count, plural, one {# day} other {# days}}`).
- `LanguageSwitcher.tsx` in settings; persists to `users/{uid}/meta/settings.language`.
- `src/features/notifications/fcm.ts`:
  - `requestPermission()` → get FCM token → save to `users.fcmTokens.{token} = true`.
  - Listen for foreground messages, show in-app toast.
- `src/features/timer/ChapterPicker.tsx` — dropdown in timer to pick subject + chapter; populates `chapterId` on session write.
- `src/features/export/ExportButton.tsx`:
  - Calls `getUserData` callable → downloads JSON file `{ profile, syllabus, sessions, tasks, settings }`.
- Cloud Function `deleteUserData` (callable, requires `request.auth.uid == uid`):
  - Delete `/users/{uid}/*` recursively.
  - Delete from Firebase Auth.
- `ThemeSwitcher.tsx` — dark/light/auto; sets `<html class="dark|light">`; persists to settings.
- `src/components/StreakFlame.tsx` — 4 intensity tiers (1-3 / 4-10 / 11-30 / 30+); Framer Motion variants for each.
- Tests: i18n plural form rendering, theme persistence, FCM token save (mock), export shape.
- Tasks: ~8.

**M8 — Polish + Ship**
- `tests/e2e/` full Playwright suite:
  - `auth.spec.ts` — Google sign-in (mock), onboarding.
  - `timer-persistence.spec.ts` — start, switch tab 60s, assert elapsed ±1s.
  - `syllabus.spec.ts` — mark chapter, verify upcoming tasks created.
  - `subscribe.spec.ts` — happy path + admin rejection.
  - `a11y.spec.ts` — axe-core on every route, fail if ≥ serious issues.
- `vite.config.ts` — bundle budget: `build.rollupOptions.output.maxEntrypointSize = 250 * 1024` (initial JS ≤ 250KB gzipped).
- `src/lib/sentry.ts` — `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })`. Source maps uploaded via `@sentry/vite-plugin` in CI.
- `src/pages/Privacy.tsx` — privacy policy in Bangla + English.
- `src/pages/Landing.tsx` — marketing landing (`/`, no auth): hero, features, screenshots, CTA to login. Used as `/` when user is signed-out.
- `public/manifest.webmanifest` — PWA manifest (name "HSC Crackers", short_name, theme_color `#2E5A88`, background_color `#0F1620`, icons in `/public/icons/`).
- `src/lib/sw.ts` — Workbox service worker (use `vite-plugin-pwa`): precache shell, runtime cache for `/analytics/*` (stale-while-revalidate), offline fallback page.
- Final `firestore.rules` + `storage.rules` audit and `firebase deploy`.
- Lighthouse CI in GitHub Actions: fail if Performance/A11y/PWA < 90.
- Tasks: ~6.

---

## 7. Cross-cutting concerns (apply to all three plans)

- **TDD:** Every task writes the failing test BEFORE the implementation.
- **Frequent commits:** Each task ends with `git commit`. Never bundle.
- **TypeScript strict:** tsconfig has `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **No secrets in repo:** All keys via `.env` (committed `.env.example` only). CI injects real keys.
- **Bangla-aware date math:** Use `date-fns-tz` with `Asia/Dhaka`. Never use `Date.now()` for display logic — only for timing.
- **i18n from day 1:** Even M1 should have `i18next` initialized with English so every UI string is a t() call from the start.
- **Accessibility from day 1:** Every interactive element has `aria-label` or visible label. Focus rings visible. Reduced-motion respected.

---

## 8. Subagent failure post-mortem

What went wrong:
- Dispatched 3 subagents in parallel at 14:23 with `run_in_background: true`.
- All 3 hit provider rate limits (model `minimax-m3:cloud` rate-limited at ~5 min each).
- No plan files were created (only the README.md that I wrote myself).

What to do next time:
- Dispatch subagents **sequentially**, not in parallel, OR
- Reduce per-subagent task to a single milestone (not 3) so each finishes under the rate-limit window, OR
- Write plans myself directly (no subagent).

---

## 9. Exact prompt to give the next agent (copy-paste this)

```
You are writing an implementation plan for an HSC study-tracker PWA.

READ FIRST (in this order):
1. F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md (design spec, 660 lines)
2. F:\Studytracker\docs\superpowers\plans\HANDOFF.md (this file — full session context)
3. F:\Studytracker\docs\superpowers\plans\2026-07-29-README.md (plan index)

THEN WRITE THE FIRST PLAN FILE:
F:\Studytracker\docs\superpowers\plans\2026-07-29-foundation-and-profile-plan.md

Cover Milestones 1, 2, 3 from HANDOFF.md §4.

Use the writing-plans skill format (header + tasks with Files / Steps / Commit pattern).
Full code in every step. Exact commands. NO placeholders.
TDD: write failing test → run → implement → run → commit.
```

For plans 2 and 3, change the file name and milestone scope accordingly.

---

## 10. Git state

```
$ git log --oneline
f5f8a18 docs: design spec v1 for HSC study tracker
```

Two untracked files in `docs/superpowers/plans/`:
- `2026-07-29-README.md` (the index, already written)
- `HANDOFF.md` (this file)

Commit them after reading:
```bash
cd F:/Studytracker
git add docs/
git commit -m "docs: plan index + handoff for HSC study tracker"
```

---

## 11. Quick file map of what to read

```
F:\Studytracker\
├── AGENTS.md                                          # workspace rules (CodeGenome MCP)
├── package.json                                       # only the scraper (puppeteer+website-scraper)
├── download2.js                                       # scraper (do not modify)
├── Study-tracker-copy\                                # downloaded original (reference only)
│   ├── index.html
│   ├── subscribe.html
│   ├── cdn.jsdelivr.net\npm\chart.js
│   ├── fonts\*.ttf
│   ├── www.gstatic.com\firebasejs\10.13.0\
│   └── study-tracker-hsc.web.app\
│       ├── dashboard
│       ├── assets\logo.png
│       ├── css\style.css
│       └── js\{firebase-config,access,ui-helpers,syllabus-data,syllabus,timer,dashboard}.js
└── docs\
    └── superpowers\
        ├── specs\
        │   └── 2026-07-29-hsc-study-tracker-design.md  # READ FIRST
        └── plans\
            ├── 2026-07-29-README.md                    # plan index
            └── HANDOFF.md                              # this file
```

Three plan files to create:
- `F:\Studytracker\docs\superpowers\plans\2026-07-29-foundation-and-profile-plan.md`
- `F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`
- `F:\Studytracker\docs\superpowers\plans\2026-07-29-subscription-admin-and-ship-plan.md`

---

## Plan 2 → Plan 3 Handoff (added 2026-07-30)

**Plan 2 shipped:**
- Timer core (Date.now()-anchored, persists across tab-switch, ±1 s)
- Server-anchored sessions (`sessionStart` + `processStudySession`)
- BST midnight split, presence nonces, offline queue + replay
- PaceCard (Recharts radial, 4 color states) + ExamCountdown
- Time-block CRUD + timeline UI (06:00–23:00)
- `pickDailyPlan` + `generateDailyPlan` 05:00 Asia/Dhaka cron
- DailyPlanCard widget
- Leaderboard read + 15-min RankGate + hourly rollup cron + 30d prune
- Overview integration in Home (PaceCard + ExamCountdown + DailyPlanCard grid)
- CI runs Functions tests (added `Functions test` step in `build-test` job)
- Playwright timer-persistence spec **not committed** — repo has no `@playwright/test` install, no `playwright.config.ts`, no `tests/e2e/`. Per Plan 2 Session 6 decision rule: skipped. Re-add when Playwright is configured in the repo.

**Plan 3 must address:**
1. **Wire `/__test/timer`** — a dev-only route that mounts `TimerUI` with a mock uid, AND install + configure `@playwright/test` so the timer-persistence e2e can run.
2. **Full BN/EN translations** — replace placeholder keys in `bn.json`.
3. **FCM notifications** — call into `users.fcmTokens` written by Plan 1's `onboardingProfile`.
4. **Chapter-tagging UI** in the timer (pass `chapterId` to `processStudySession`).
5. **Subscription + admin approval flow** + data export.
6. **PWA manifest + Workbox + Sentry + accessibility audit + privacy policy + marketing page**.

---

## Plan 3 → v1.0 Handoff (added 2026-08-01)

**Plan 3 shipped** (9 sessions, all stacked off `feat/plan-2`):
- Session 1: `storage.rules` deny-by-default with `paymentRequests/{uid}/{file}` path; dev-only `/__test/timer` route; `@playwright/test` installed; `tests/e2e/timer-persistence.spec.ts` un-skipped.
- Session 2 (M6): `PlansGrid` + `SubscribeForm` + `SubscribeScreen` at `/app/subscribe`; pure pricing helpers in `plans.ts`.
- Session 3 (M6): `generateSignedUploadUrl` Cloud Function (5-min signed PUT, image/* only); `paymentSubmit.ts` client; `paymentRequests` rules test.
- Session 4 (M6): `useIsAdmin` hook; `approvePayment` Cloud Function with audit log; `ApprovalQueue` UI + `RequireAdmin` guard; `/admin` route.
- Session 5 (M7): Full BN translations, `LanguageSwitcher` + `SettingsScreen`, ICU plural support (`compatibilityJSON: 'v4'`, `_one`/`_other` suffixes).
- Session 6 (M7): FCM client helpers (`requestNotificationPermission`, `registerFcmToken`, `listenForForegroundMessages`); `sendRevisionReminder` scheduled function; `fcmTokens` rules match.
- Session 7 (M7): `ChapterPicker` (subject+chapter dropdown); `getUserData` + `deleteUserData` Cloud Functions; `ExportButton`; `ThemeSwitcher`; `StreakFlame` (5-tier); `Landing` at `/welcome`; `Privacy` at `/privacy`.
- Session 8 (M8): `vite-plugin-pwa` with HSC Crackers manifest + Workbox SW + firestore runtime cache; `@sentry/browser` init wrapper; ErrorBoundary forwards to Sentry.
- Session 9: `tests/e2e/public-routes.spec.ts` (landing, privacy, auth redirect). Lighthouse CI is **not** wired (no remote + budget policy deferred to follow-up). Playwright suite is structurally complete (4 specs) but **does not run in CI yet** — required `npm run dev` on port 5173 with `VITE_ENABLE_TEST_ROUTES=true`.

**Test totals:**
- `apps/web`: 136 vitest tests across 52 files (rules unit tests use the Firebase rules-unit-testing harness against the emulator).
- `apps/functions`: 21 vitest tests across 9 files.
- All green on `feat/plan-2` after Session 9 commit.

**Definition of Done status (from spec §16):**
- [x] Google sign-in scaffolded (Plan 1).
- [x] Onboarding asks for medium + batch + college (Plan 1).
- [x] First focus session server-validated (Plan 2 processStudySession).
- [x] Timer keeps running across tab-switch (Playwright `timer-persistence.spec.ts`, gated on dev route).
- [x] Marking 1st Study auto-creates revisions (Plan 1 scheduledRevisions).
- [x] Daily Plan widget (Plan 2 DailyPlanCard).
- [x] Bangla + English UI both complete (Session 5, full bn.json).
- [x] Palette = Cool Slate (Plan 1).
- [ ] Lighthouse ≥ 90 on /app — **not measured in this run** (no Lighthouse CI step in `.github/workflows/ci.yml`).
- [ ] Sentry zero unresolved > 24h — depends on first real users; Sentry init wired.
- [x] Firestore rules 100% covered (users, paymentRequests, fcmTokens tests).
- [x] Pace card respects batchId (Plan 2).
- [x] Privacy policy + data-deletion flow live (Session 7 + 8).
- [x] Admin approves → student sees pill (Session 4, approvePayment writes subscription immediately).

**Known gaps to address in v1.0.1:**
1. Lighthouse CI not configured. Add a GitHub Actions step running `lighthouse-ci` against `firebase hosting:channel:deploy`.
2. Playwright suite is not run in CI — needs a CI step that boots `firebase emulators:exec` and runs `npm run test:e2e`.
3. `signInWithPopup` Google button in Plan 1 is a stub — real Google OAuth client ID must be set in `.env.production` before launch.
4. `sendRevisionReminder` and `sendStreakGuard` are scaffolded but only the pure builder is unit-tested; scheduled function needs an emulator integration test.
5. `chapterId` is collected by `ChapterPicker` but not yet threaded into `processStudySession` request — that's a Plan 4 task.
6. PWA icons (`/icons/icon-192.png`, `icon-512.png`) referenced in manifest do not exist yet. Create them before deploy.

**How to deploy v1.0:**
1. Merge `feat/plan-2` → `main` (PR; preserve history).
2. CI: add Lighthouse CI + Playwright steps (see gaps above).
3. Firebase project: create `hsc-crackers-prod`, enable Auth + Firestore + Functions + Storage + FCM. Apply `firebase deploy` with `firebase.json` at root.
4. Set production env in Firebase Hosting config: `VITE_FIREBASE_*`, `VITE_SENTRY_DSN`, `VITE_ENABLE_TEST_ROUTES=false`.
5. Seed `/batches/HSC-2024…HSC-2030` + `/syllabus/{bangla,english}/*` via the existing seed scripts (`npm run seed:batches`, `npm run seed:syllabus`).
6. Bootstrap an admin by manually creating `/admins/{uid}` doc in the Firebase console for at least one operator.
