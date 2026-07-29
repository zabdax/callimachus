# Plan 2 — Session 5 Prompt: Leaderboard

> **For the agent executing this session:** Read this entire prompt before touching any code.

## Mission

Implement **Plan 2 — Session 5: Leaderboard** for the HSC Study Tracker.

This session ships the **community leaderboard read path** + **hourly roll-up cron**. After this session:

1. A `leaderboard.ts` module exposes `sortTop10`, `isRankUnlocked` (15-min gate = 900 s), `readDailyLeaderboard`, and `readMonthlyLeaderboard` — fully unit-tested in isolation.
2. A `RankGate` UI component renders a 🔒 "Study Xm more to unlock" message until the user has ≥ 15 minutes today, then renders the top-10 ordered list.
3. A `rollUpLeaderboards` scheduled Cloud Function fires **hourly** (Asia/Dhaka), merges all daily leaderboard docs into `analytics/leaderboard_monthly/{YYYY-MM}`, and prunes daily docs older than 30 days.

The end state: `npm test` and `npm run build` green in BOTH `apps/web` AND `apps/functions`, one session commit, branch ready for Session 6.

## Prerequisites

- Branch `plan2/session4-daily-plan` exists with the Session 4 commit.
- `analytics/leaderboard_daily/{date}/users/{uid}` and `analytics/leaderboard_daily/{date}` docs are being written by `processStudySession` (Session 2).
- `firestore.rules` allows the client to read `analytics/leaderboard_daily` and `analytics/leaderboard_monthly`. If the existing rules block these reads, you may need to add read rules — but ASK before modifying `firestore.rules` because it's shared with other sessions.

## Source-of-truth plan

This session rolls up atomic tasks **T13 and T14** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

Use the EXACT code, file paths, and test contents from those tasks.

## Skills required

- **`superpowers:test-driven-development`** — failing test FIRST.

Also available: `superpowers:systematic-debugging`, `superpowers:verification-before-completion`.

## Working directory

- Web app: `F:\Studytracker\apps\web`
- Functions: `F:\Studytracker\apps\functions`

## Branch

```bash
cd F:/Studytracker
git fetch origin
git switch plan2/session4-daily-plan   # or main if Session 4 was merged
git switch -c plan2/session5-leaderboard
```

## Quality bars

- [ ] 80% line coverage on new `apps/web/src/features/leaderboard/*` files.
- [ ] 80% line coverage on `apps/functions/src/rollUpLeaderboards.ts`.
- [ ] TDD discipline.
- [ ] One session commit: `feat(leaderboard): read + RankGate + hourly rollup cron + 30d prune`
- [ ] `npm run lint && npm test && npm run build` green in BOTH apps.

## Files you will create

### Web

| Path | Purpose |
|---|---|
| `src/features/leaderboard/leaderboard.ts` | Pure sortTop10, isRankUnlocked + Firestore read helpers |
| `src/features/leaderboard/RankGate.tsx` | 15-min gate UI |
| `tests/features/leaderboard/leaderboard.test.ts` | sortTop10 + isRankUnlocked tests |

### Functions

| Path | Purpose |
|---|---|
| `src/rollUpLeaderboards.ts` | Hourly cron |
| `tests/rollUpLeaderboards.test.ts` | Pure helpers test |

## Files you will modify

| Path | Change |
|---|---|
| `apps/functions/src/index.ts` | Export `rollUpLeaderboards` |

(No new dependencies.)

---

## Step-by-step execution

---

### Step 1: Sanity-check

```bash
cd F:/Studytracker
git status
git branch --show-current
grep -rn "leaderboard_daily\|leaderboard_monthly" firestore.rules
```

If the rules don't permit reading `analytics/leaderboard_*` for authenticated users, you'll get runtime permission errors when `readDailyLeaderboard` is exercised against the emulator. Note this for the report — don't change rules unless necessary and ask first.

---

### Step 2: Task T13 — `leaderboard.ts` + `RankGate`

**2a. Write the failing test FIRST.**

Create `apps/web/tests/features/leaderboard/leaderboard.test.ts` with EXACT contents from plan §T13 Step 1. Two tests:
- `sortTop10` returns 10 entries, top is `u0`.
- `isRankUnlocked` requires ≥ 900 s.

**2b. Run — verify FAIL.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/leaderboard/leaderboard.test.ts
```

**2c. Implement `apps/web/src/features/leaderboard/leaderboard.ts`** with EXACT contents from plan §T13 Step 2. Key constants and signatures:
- `RANK_GATE_SEC = 15 * 60`.
- `LbUser = { uid, durationSec, name?, photoURL?, college? }`.
- `sortTop10(users)` — sort desc, slice 10.
- `isRankUnlocked(todaySec)` — `todaySec >= RANK_GATE_SEC`.
- `readDailyLeaderboard(date)` — reads `analytics/leaderboard_daily/{date}` and the `users` map.
- `readMonthlyLeaderboard(month)` — reads `analytics/leaderboard_monthly/{month}` and the `users` map.

**2d. Implement `apps/web/src/features/leaderboard/RankGate.tsx`** with EXACT contents from plan §T13 Step 2. UI:
- If not unlocked → `<p>🔒 Study Xm more to unlock the leaderboard.</p>`.
- Else → `<ol>` of top 10 with minutes display.

**2e. Run — verify PASS.**

---

### Step 3: Task T14 — `rollUpLeaderboards` cron + helpers

**3a. Write the failing test FIRST.**

Create `apps/functions/tests/rollUpLeaderboards.test.ts` with EXACT contents from plan §T14 Step 1. Three pure tests:
- `mergeUsersMap` sums per-uid durations across input arrays.
- `monthKey` returns `YYYY-MM`.
- `pruneCutoff` is 30 days ago (ISO slice equality).

**3b. Run — verify FAIL.**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/rollUpLeaderboards.test.ts
```

**3c. Implement `apps/functions/src/rollUpLeaderboards.ts`** with EXACT contents from plan §T14 Step 2. Important details:
- `mergeUsersMap(days)` — reduce `Record<string, number>` arrays.
- `monthKey(d)` — `d.toISOString().slice(0, 7)` (UTC).
- `pruneCutoff(now)` — `now - 30 * 86400_000`.
- `rollUpLeaderboards = onSchedule({ schedule: '0 * * * *', timeZone: 'Asia/Dhaka' }, ...)`.
- The handler reads `analytics/leaderboard_daily` collection, merges, writes `analytics/leaderboard_monthly/{month}`, then prunes daily docs older than the cutoff.

**3d. Update `apps/functions/src/index.ts`:**

```ts
export { rollUpLeaderboards } from './rollUpLeaderboards.js';
```

Preserve any existing exports.

**3e. Run + build — verify PASS.**

```bash
cd F:/Studytracker/apps/functions
npm test
npm run build
```

---

### Step 4: Full sweep

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build

cd F:/Studytracker/apps/functions
npm run lint   # only if script exists
npm test
npm run build
```

Coverage:

```bash
cd F:/Studytracker/apps/web
npm test -- --coverage tests/features/leaderboard
```

Expected: ≥80% on `leaderboard.ts` (RankGate is best-effort UI).

```bash
cd F:/Studytracker/apps/functions
npm test -- --coverage tests/rollUpLeaderboards.test.ts
```

Expected: ≥80% on `rollUpLeaderboards.ts` (the handler's `onSchedule` callback itself is exercised by the pure helpers; the handler body is mocked out of the unit tests).

---

### Step 5: Single session commit

```bash
cd F:/Studytracker
git add apps/web apps/functions
git status
git commit -m "feat(leaderboard): read + RankGate + hourly rollup cron + 30d prune"
```

---

### Step 6: Push and report

```bash
cd F:/Studytracker
git push -u origin plan2/session5-leaderboard
```

Then output:

```
Session 5 complete.

Branch: plan2/session5-leaderboard
Commit: feat(leaderboard): read + RankGate + hourly rollup cron + 30d prune

Shipped:
  ✓ leaderboard.ts pure helpers (sortTop10, isRankUnlocked, RANK_GATE_SEC = 15min)
  ✓ readDailyLeaderboard + readMonthlyLeaderboard (Firestore reads)
  ✓ RankGate UI (🔒 lock + top-10 list)
  ✓ rollUpLeaderboards hourly cron (Asia/Dhaka) + 30-day prune

Verification:
  ✓ apps/web: lint + test + build all green
  ✓ apps/functions: test + build green
  ✓ Coverage ≥80% on new files

Next session:
  Session 6 — Overview + E2E + CI + Handoff (T15 + T16 + T17 + T18).
  Branch from: plan2/session5-leaderboard.
```

---

## What NOT to do

- ❌ Do not implement Session 6 tasks.
- ❌ Do not modify `firestore.rules` unless absolutely necessary — and ASK before doing so.
- ❌ Do not wire `RankGate` into a route — Session 6 may mount it in `Overview`, but it's not required.
- ❌ Do not skip failing-test-first.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main`.

## When to stop and ask the user

1. `firestore.rules` blocks reading `analytics/leaderboard_*` and you can't determine whether adding a read rule is safe without understanding what other sessions depend on the current rule.
2. The `mergeUsersMap` test fails because of a subtle Object ordering issue — verify with `toEqual` (not `toStrictEqual`) and check whether your implementation accidentally creates `undefined` keys.
3. The functions build fails because the cron handler imports types that don't resolve.
4. Coverage comes out below 80% AND the uncovered lines are the `onSchedule` callback body (which is mocked out — note that as best-effort).