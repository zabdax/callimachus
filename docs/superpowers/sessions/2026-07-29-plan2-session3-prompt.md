# Plan 2 — Session 3 Prompt: Progress + Pace Card

> **For the agent executing this session:** Read this entire prompt before touching any code.

## Mission

Implement **Plan 2 — Session 3: Progress + Pace Card** for the HSC Study Tracker.

This session ships the **batch-aware pace card** that the Overview screen (Session 6) will mount. After this session:

1. A pure `pace.ts` module exposes `pacePct`, `remainingDays`, and `forecastFinishDate` — fully unit-tested in isolation.
2. A `useBatch` TanStack Query hook reads `/batches/{batchId}` from Firestore, defensively unwrapping timestamps.
3. A `PaceCard` component renders a Recharts `RadialBarChart` with **4 color states** (`pre-start`, `in-session`, `exam-window`, `resulted`) using the palette tokens from design spec §6.1.
4. An `ExamCountdown` widget displays days-to-HSC.

The end state: `npm test` and `npm run build` green in `apps/web`, one session commit, branch ready for Session 4.

## Prerequisites

- Branch `plan2/session2-server-anchored-timer` exists with the Session 2 commit merged in (or rebased onto your current working branch).
- `recomputeBatchStatus` from Plan 1 is available at `@/features/batches/recomputeBatchStatus` and exports a `BatchDates` type with `collegeStart`, `examStart`, `examEnd` as `Date` instances.
- `recharts` not yet installed (this session installs it).

## Source-of-truth plan

This session rolls up atomic tasks **T9 and T10** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

Use the EXACT code, file paths, and test contents from those tasks.

## Skills required

Invoke first via the `Skill` tool:

- **`superpowers:test-driven-development`** — failing test FIRST.

Also available:
- `superpowers:systematic-debugging`
- `superpowers:verification-before-completion`

## Working directory

- Web app: `F:\Studytracker\apps\web`

## Branch

```bash
cd F:/Studytracker
git fetch origin
git switch plan2/session2-server-anchored-timer   # or main if Session 2 was merged
git switch -c plan2/session3-progress-pace
```

## Quality bars

- [ ] 80% line coverage on `src/features/progress/pace.ts`, `useBatch.ts`, `PaceCard.tsx`, `ExamCountdown.tsx`.
- [ ] TDD discipline.
- [ ] One session commit: `feat(progress): pace math + PaceCard (recharts radial, 4 states) + ExamCountdown`
- [ ] `npm run lint && npm test && npm run build` green.

## Files you will create

| Path | Purpose |
|---|---|
| `src/features/progress/pace.ts` | Pure pace math |
| `src/features/progress/useBatch.ts` | TanStack Query read of `/batches/{batchId}` |
| `src/features/progress/PaceCard.tsx` | Recharts radial UI |
| `src/features/progress/ExamCountdown.tsx` | Days-to-exam widget |
| `tests/features/progress/pace.test.ts` | Pace + forecast tests |
| `tests/features/progress/PaceCard.test.tsx` | Renders batch label |

## Files you will modify

| Path | Change |
|---|---|
| `apps/web/package.json` | Add `recharts@^2.12.7` |

---

## Step-by-step execution

### Step 1: Sanity-check

```bash
cd F:/Studytracker
git status
git branch --show-current
ls apps/web/src/features/batches   # confirm recomputeBatchStatus exists
```

If `recomputeBatchStatus.ts` is missing, STOP and ask — Session 3 depends on it.

---

### Step 2: Install Recharts

```bash
cd F:/Studytracker/apps/web
npm i recharts@^2.12.7
```

Verify `"recharts"` appears in `dependencies`.

---

### Step 3: Task T9 — Pure pace math

**3a. Write failing tests FIRST.**

Create `apps/web/tests/features/progress/pace.test.ts` with EXACT contents from plan §T9 Step 1. The test imports `pacePct`, `remainingDays`, `forecastFinishDate` from `@/features/progress/pace`.

**3b. Run — verify FAIL.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/progress/pace.test.ts
```

**3c. Implement `apps/web/src/features/progress/pace.ts`** with EXACT contents from plan §T9 Step 2. Note `BatchDates` is imported from `@/features/batches/recomputeBatchStatus` (NOT redefined locally).

**3d. Run — verify PASS.**

---

### Step 4: Task T10 — `useBatch` hook

**4a. Inspect the existing TanStack Query setup.**

```bash
cd F:/Studytracker/apps/web
grep -rn "useQuery" src/ | head -5
```

Confirm `QueryClientProvider` is mounted in the app root (Plan 1 should have wired it). If not, STOP and ask.

**4b. Implement `apps/web/src/features/progress/useBatch.ts`** with EXACT contents from plan §T10 Step 2. Key points:
- Uses `useQuery` with `queryKey: ['batch', batchId]` and `enabled: !!batchId`.
- Defensively unwraps Firestore timestamps (`collegeStart.toDate()`, etc.).
- Returns `null` if the batch doc doesn't exist.

**4c. No test file for `useBatch`** — the plan only tests `PaceCard` (which mocks `useBatch`). Don't invent a test.

---

### Step 5: Task T10 — `PaceCard` + `ExamCountdown`

**5a. Write the failing test FIRST.**

Create `apps/web/tests/features/progress/PaceCard.test.tsx` with EXACT contents from plan §T10 Step 3. Mocks `@/features/progress/useBatch`.

**5b. Run — verify FAIL.**

**5c. Confirm the design tokens.**

```bash
cd F:/Studytracker/apps/web
cat tailwind.config.ts
grep -rn "var(--" src/ | head -10
```

The plan uses `var(--primary)`, `var(--surface-2)`, `bg-bg`, `text-text`, `bg-surface`, `text-text-dim`. If these aren't defined yet, the component will fall back to Tailwind defaults — that's acceptable for this session. **Do not** introduce the full palette system; that's Plan 3 work.

**5d. Implement `apps/web/src/features/progress/PaceCard.tsx`** with EXACT contents from plan §T10 Step 4. Critical bits:
- `useBatch(batchId)` for data.
- `pacePct(batch, now)` for percentage.
- `recomputeBatchStatus(batch, now)` for status (the 4 states).
- Color map: `pre-start: #94A3B8`, `in-session: #2E5A88`, `exam-window: #E0A458`, `resulted: #3F6B4E`.
- Recharts `<RadialBarChart innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}>`.

**5e. Implement `apps/web/src/features/progress/ExamCountdown.tsx`** with EXACT contents from plan §T10 Step 4 (just below PaceCard code).

**5f. Run UI test + build — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/progress
npm run build
```

---

### Step 6: Full sweep

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build
```

Expected: green. Coverage:

```bash
npm test -- --coverage tests/features/progress
```

Expected: ≥80% on `pace.ts`, `useBatch.ts`, `PaceCard.tsx`, `ExamCountdown.tsx`.

---

### Step 7: Single session commit

```bash
cd F:/Studytracker
git add apps/web
git status
git commit -m "feat(progress): pace math + PaceCard (recharts radial, 4 states) + ExamCountdown"
```

---

### Step 8: Push and report

```bash
cd F:/Studytracker
git push -u origin plan2/session3-progress-pace
```

Then output:

```
Session 3 complete.

Branch: plan2/session3-progress-pace
Commit: feat(progress): pace math + PaceCard (recharts radial, 4 states) + ExamCountdown

Shipped:
  ✓ pace.ts pure math (pacePct, remainingDays, forecastFinishDate)
  ✓ useBatch TanStack Query hook (defensive timestamp unwrap)
  ✓ PaceCard: Recharts radial, 4 color states, batch-aware
  ✓ ExamCountdown widget

Verification:
  ✓ npm run lint — clean
  ✓ npm test — all progress tests pass
  ✓ npm run build — succeeds
  ✓ Coverage ≥80% on new files

Next session:
  Session 4 — Daily Plan + Time Blocks (T11 + T12: CRUD + timeline UI + picker + generateDailyPlan cron + DailyPlanCard).
  Branch from: plan2/session3-progress-pace.
```

---

## What NOT to do

- ❌ Do not implement Sessions 4–6 tasks.
- ❌ Do not introduce the full palette system (that's Plan 3).
- ❌ Do not wire `PaceCard` into `Home.tsx` or any route — that's Session 6.
- ❌ Do not skip failing-test-first.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main`.

## When to stop and ask the user

1. `recomputeBatchStatus` does not exist or doesn't export `BatchDates` with `Date` instances.
2. TanStack Query isn't set up in the app root.
3. Recharts version conflicts with React 18 (the install fails).
4. The Recharts radial chart test fails because `ResponsiveContainer` needs a measured DOM — you may need to mock `ResponsiveContainer` or use `vi.mock('recharts', ...)`.
5. Coverage comes out below 80% on a file AND the uncovered lines are due to Recharts internals (not your code).