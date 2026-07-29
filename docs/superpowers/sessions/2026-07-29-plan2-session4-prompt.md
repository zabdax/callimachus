# Plan 2 — Session 4 Prompt: Daily Plan + Time Blocks

> **For the agent executing this session:** Read this entire prompt before touching any code.

## Mission

Implement **Plan 2 — Session 4: Daily Plan + Time Blocks** for the HSC Study Tracker.

This session ships the **daily plan + time-blocking UI** that the Overview screen (Session 6) will mount. After this session:

1. A `blocks.ts` module provides CRUD for `users/{uid}/meta/timeBlocks/{id}` with a **pure conflict detector** (`hasConflict`) that's unit-tested in isolation.
2. A `useTimeBlocks` TanStack Query hook wraps the CRUD operations and invalidates the cache on mutation.
3. A `TimeBlockTimeline` UI renders the day 06:00–23:00 with click-to-add slots and per-block complete action.
4. A pure `pickDailyPlan` picker sorts pending `upcomingTasks` by `scheduledFor` and fits the top 4 within a 240-minute budget.
5. A `generateDailyPlan` scheduled Cloud Function fires at **05:00 Asia/Dhaka**, reads each user's pending `upcomingTasks` due within 48 h, picks a plan with `pickDailyPlan`, and writes `users/{uid}/meta/dailyPlan/{date}`.
6. A `DailyPlanCard` widget reads today's plan and renders it as an ordered list.

The end state: `npm test` and `npm run build` green in **BOTH** `apps/web` AND `apps/functions`, one session commit, branch ready for Session 5.

## Prerequisites

- Branch `plan2/session3-progress-pace` exists with the Session 3 commit.
- `apps/web/src/features/batches/recomputeBatchStatus.ts` exists (Plan 1).
- `upcomingTasks` collection (Plan 1) is in place — `generateDailyPlan` reads from it.
- The functions tsconfig can resolve shared web code via `../../web/src/features/...js` (confirmed in Session 2).

## Source-of-truth plan

This session rolls up atomic tasks **T11 and T12** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

Use the EXACT code, file paths, and test contents from those tasks.

**Note**: The parent plan's file map at the top of Session 4 references `pickDailyPlan.test.ts` but the T12 step writes `dailyPlanPicker.test.ts`. Create whichever the plan's T12 Step 1 specifies — use **`dailyPlanPicker.test.ts`** as written in §T12 Step 1. Verify this matches your actual filesystem before committing; either filename is acceptable as long as the test contents are correct.

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
git switch plan2/session3-progress-pace   # or main if Session 3 was merged
git switch -c plan2/session4-daily-plan
```

## Quality bars

- [ ] 80% line coverage on new `apps/web/src/features/dailyPlan/*` files.
- [ ] 80% line coverage on `apps/functions/src/generateDailyPlan.ts` (test it via the picker — the function itself can be exercised through the picker unit test, since the picker is the heart of the logic).
- [ ] TDD discipline.
- [ ] One session commit: `feat(dailyPlan): time-block CRUD + picker + 05:00 cron + DailyPlanCard`
- [ ] `npm run lint && npm test && npm run build` green in BOTH apps.

## Files you will create

### Web

| Path | Purpose |
|---|---|
| `src/features/dailyPlan/blocks.ts` | CRUD + pure `hasConflict` |
| `src/features/dailyPlan/useTimeBlocks.ts` | TanStack Query wrapper |
| `src/features/dailyPlan/TimeBlockTimeline.tsx` | 06:00–23:00 timeline UI |
| `src/features/dailyPlan/pickDailyPlan.ts` | Pure picker |
| `src/features/dailyPlan/DailyPlanCard.tsx` | Widget that reads `meta/dailyPlan/{date}` |
| `tests/features/dailyPlan/blocks.test.ts` | Conflict detection tests |
| `tests/features/dailyPlan/pickDailyPlan.test.ts` *(or `dailyPlanPicker.test.ts` per T12 Step 1 — match the plan exactly)* | Picker test |

### Functions

| Path | Purpose |
|---|---|
| `src/generateDailyPlan.ts` | 05:00 Asia/Dhaka scheduled function |

## Files you will modify

| Path | Change |
|---|---|
| `apps/functions/src/index.ts` | Export `generateDailyPlan` |

(No new dependencies — everything is already installed.)

---

## Step-by-step execution

---

### Step 1: Sanity-check

```bash
cd F:/Studytracker
git status
git branch --show-current
ls apps/web/src/features
grep -rn "upcomingTasks" apps/web/src/ apps/functions/src/ | head -5
```

Expected: clean tree, branch = `plan2/session4-daily-plan`, `upcomingTasks` references exist.

---

### Step 2: Task T11 — Time-block CRUD + conflict detection

**2a. Write the failing test FIRST.**

Create `apps/web/tests/features/dailyPlan/blocks.test.ts` with EXACT contents from plan §T11 Step 2. Three cases:
- overlap on same hour → conflict
- adjacent blocks (9:00–10:00 + 10:00–11:00) → no conflict
- already-completed blocks ignored

**2b. Run — verify FAIL.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/dailyPlan/blocks.test.ts
```

**2c. Implement `apps/web/src/features/dailyPlan/blocks.ts`** with EXACT contents from plan §T11 Step 3. Note:
- `TimeBlock` type has `id`, `uid`, `date` (YYYY-MM-DD in Asia/Dhaka), `startHour` (0–23), `durationMin`, `subjectId`, `chapterId`, `completedAt: Date | null`, `source: 'manual' | 'auto-plan'`.
- `hasConflict(blocks, candidate)`: ignore completed blocks AND different dates. Compute intervals in minutes and check overlap.
- `listTimeBlocks(uid, date)` queries `users/{uid}/meta/timeBlocks where date == date`.
- `addBlock` + `completeBlock` use `serverTimestamp()`.

**2d. Implement `apps/web/src/features/dailyPlan/useTimeBlocks.ts`** with EXACT contents from plan §T11 Step 3 (TanStack Query `useQuery` + `useMutation` with cache invalidation).

**2e. Run — verify PASS.**

---

### Step 3: Task T11 — `TimeBlockTimeline` UI

**3a. Implement `apps/web/src/features/dailyPlan/TimeBlockTimeline.tsx`** with EXACT contents from plan §T11 Step 4. Highlights:
- `HOURS = [6, 7, ..., 23]` (18 slots).
- `todayKey()` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' })` for the YYYY-MM-DD key.
- Click an empty slot → enters "picked" state showing a small form with subjectId + chapterId inputs.
- On add → call `add.mutate({ ... })`.
- Existing block → "complete" button (calls `complete.mutate(b.id)`).

No dedicated test for this component in the plan — don't invent one. Coverage is judged on `blocks.ts` + `useTimeBlocks.ts`.

**3b. Build only — verify no TS errors.**

```bash
cd F:/Studytracker/apps/web
npm run build
```

---

### Step 4: Task T12 — `pickDailyPlan` picker

**4a. Write the failing test FIRST.**

Create `apps/web/tests/features/dailyPlan/pickDailyPlan.test.ts` (or `dailyPlanPicker.test.ts` to match §T12 Step 1 exactly) with EXACT contents from plan §T12 Step 1. The test fixture uses 5 tasks with explicit `scheduledFor` timestamps and expects `pickDailyPlan(tasks, 240)` to return `['c', 'b', 'd', 'a']` (sorted by scheduledFor ascending, fitted to 240 min, max 4 items).

**4b. Run — verify FAIL.**

**4c. Implement `apps/web/src/features/dailyPlan/pickDailyPlan.ts`** with EXACT contents from plan §T12 Step 2. Sort ascending by `scheduledFor.getTime()`, iterate, add to `out` only if `used + t.minutes <= 240`, stop after 4 items.

**4d. Run — verify PASS.**

---

### Step 5: Task T12 — `generateDailyPlan` Cloud Function

**5a. Inspect the imports path.**

Confirm `apps/functions/tsconfig.json` allows `import` of web code. If `../../web/src/features/dailyPlan/pickDailyPlan.js` worked in Session 2, it'll work here. If you're unsure, build the functions first to confirm.

**5b. Implement `apps/functions/src/generateDailyPlan.ts`** with EXACT contents from plan §T12 Step 3. Critical bits:
- `onSchedule({ schedule: '0 5 * * *', timeZone: 'Asia/Dhaka' }, ...)`.
- `todayKey()` uses `Intl.DateTimeFormat('en-CA', { timeZone: TZ })`.
- Iterate all users, query `users/{uid}/upcomingTasks where status == pending AND scheduledFor <= now + 2d`.
- For each user, run `pickDailyPlan(tasks, 240)` and write `users/{uid}/meta/dailyPlan/{date}`.

**Note on the relative import:** the plan uses `import { pickDailyPlan } from '../../web/src/features/dailyPlan/pickDailyPlan.js';`. This may need to be `../../web/src/features/dailyPlan/pickDailyPlan.js` depending on how your build resolves `.js` extensions for `.ts` sources. If it fails, ask the user before changing the import — there may be a `tsconfig` "paths" mapping to add instead.

**5c. Update `apps/functions/src/index.ts`:**

```ts
export { generateDailyPlan } from './generateDailyPlan.js';
```

Preserve any existing exports.

**5d. Build functions — verify no TS errors.**

```bash
cd F:/Studytracker/apps/functions
npm run build
```

(The plan does NOT specify a dedicated unit test for `generateDailyPlan` — the picker is tested via Session 4's picker test, and the function's main job is orchestration. If lint or build complains, fix; otherwise move on.)

---

### Step 6: Task T12 — `DailyPlanCard` widget

**6a. Implement `apps/web/src/features/dailyPlan/DailyPlanCard.tsx`** with EXACT contents from plan §T12 Step 4. Key points:
- Uses `useQuery({ queryKey: ['dailyPlan', uid, date] })`.
- Defensively unwraps `scheduledFor.toDate()`.
- Renders nothing if the plan is null or empty.

No dedicated test for `DailyPlanCard` in the plan — don't invent one.

**6b. Build web — verify no TS errors.**

```bash
cd F:/Studytracker/apps/web
npm run build
```

---

### Step 7: Full sweep

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build

cd F:/Studytracker/apps/functions
npm run lint   # only if script exists
npm run build
```

Coverage:

```bash
cd F:/Studytracker/apps/web
npm test -- --coverage tests/features/dailyPlan
```

Expected: ≥80% on `blocks.ts`, `useTimeBlocks.ts`, `pickDailyPlan.ts`. (`TimeBlockTimeline.tsx` and `DailyPlanCard.tsx` UI are best-effort.)

---

### Step 8: Single session commit

```bash
cd F:/Studytracker
git add apps/web apps/functions
git status
git commit -m "feat(dailyPlan): time-block CRUD + picker + 05:00 cron + DailyPlanCard"
```

---

### Step 9: Push and report

```bash
cd F:/Studytracker
git push -u origin plan2/session4-daily-plan
```

Then output:

```
Session 4 complete.

Branch: plan2/session4-daily-plan
Commit: feat(dailyPlan): time-block CRUD + picker + 05:00 cron + DailyPlanCard

Shipped:
  ✓ blocks.ts CRUD + hasConflict (pure)
  ✓ useTimeBlocks TanStack Query hook
  ✓ TimeBlockTimeline 06:00–23:00 UI
  ✓ pickDailyPlan pure picker (sort + budget + max 4)
  ✓ generateDailyPlan scheduled Cloud Function (05:00 Asia/Dhaka)
  ✓ DailyPlanCard widget

Verification:
  ✓ apps/web: lint + test + build all green
  ✓ apps/functions: build green
  ✓ Coverage ≥80% on new files

Next session:
  Session 5 — Leaderboard (T13 + T14: sortTop10 + isRankUnlocked + read daily/monthly + RankGate + rollUpLeaderboards cron).
  Branch from: plan2/session4-daily-plan.
```

---

## What NOT to do

- ❌ Do not implement Sessions 5–6 tasks.
- ❌ Do not add `leaderboard` writes from `processStudySession` changes (already done in Session 2).
- ❌ Do not wire `DailyPlanCard` into any route — Session 6 mounts it in `Overview`.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main`.

## When to stop and ask the user

1. The functions tsconfig cannot resolve `../../web/src/features/dailyPlan/pickDailyPlan.js` and a `paths` mapping change is needed.
2. The picker test fails for a reason that suggests the test data shape is wrong (read §T12 Step 1 again carefully — the expected output is `['c', 'b', 'd', 'a']`, not sorted alphabetically).
3. `generateDailyPlan` build fails because of an unrelated TypeScript error in code you didn't write.
4. Coverage comes out below 80% AND the uncovered lines are in UI components the plan doesn't require to be tested.