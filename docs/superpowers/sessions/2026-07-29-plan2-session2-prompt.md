# Plan 2 — Session 2 Prompt: Server-Anchored Timer

> **For the agent executing this session:** Read this entire prompt before touching any code. The prompt is self-contained.

## Mission

Implement **Plan 2 — Session 2: Server-Anchored Timer** for the HSC Study Tracker.

This session takes the **client-side timer from Session 1** and turns it into a **server-validated, anti-cheat focus session pipeline**. After this session:

1. A `sessionStart` Cloud Function anchors the timer to `serverStartTs` so the client can't lie about when a session began.
2. A polished `TimerUI` (circular SVG ring + breathing animation + Start/Pause/Resume/Stop + "Welcome back" toast) is reachable at `/study`.
3. A `processStudySession` Cloud Function **validates** every completed session (duration range, clock-drift tolerance, overlap guard, daily cap, presence nonces), **splits** sessions across BST midnight into per-day docs, and **atomically** writes to the session, leaderboard, and chapter-stats collections.
4. A presence-nonce system issues short-lived nonces and emits one every 5 minutes to a random active session — proof that a real human is sitting at the keyboard.
5. A `stopAndSubmit` wrapper handles the offline case: submits online if possible, otherwise queues to IndexedDB (the queue from Session 1) and drains on `online` event.

The end state: **green test + build in BOTH `apps/web` AND `apps/functions`**, one session commit, branch ready for Session 3.

## Prerequisites

This session **depends on Session 1 being merged into the working branch**. If you started this session without Session 1's `feat(timer): ...` commit already in your branch, STOP and ask the user.

Required prior state:
- Branch `plan2/session1-timer-core` exists with the Session 1 commit.
- `apps/web/src/features/timer/{useTimer,dateNowDelta,persistence,offlineQueue}.ts` all present.
- `firestore.rules` already contains the `activeSession` owner-only rule.

## Source-of-truth plan

This session rolls up atomic tasks **T4, T5, T6, T7, and T8** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

Use the EXACT code, file paths, and test contents from those tasks. Do not invent new abstractions.

## Skills required

Invoke this skill first via the `Skill` tool:

- **`superpowers:test-driven-development`** — every code step writes a failing test FIRST. No exceptions.

You may also invoke:
- `superpowers:systematic-debugging` — if any test fails unexpectedly
- `superpowers:verification-before-completion` — before the final commit

## Working directory

- Repo root: `F:\Studytracker`
- Web app: `F:\Studytracker\apps\web`
- Functions: `F:\Studytracker\apps\functions`

## Branch

```bash
cd F:/Studytracker
git fetch origin
git switch plan2/session1-timer-core   # or main if Session 1 was merged
git switch -c plan2/session2-server-anchored-timer
```

## Quality bars (must hold)

- [ ] 80% line coverage on new `apps/web/src/features/timer/*` files added this session (`serverAnchor.ts`, `TimerUI.tsx`, `stopAndSubmit.ts`, `lib/time/bst.ts`).
- [ ] 80% line coverage on new `apps/functions/src/*` files.
- [ ] All Cloud Functions tested at least happy-path against mocked Firebase Admin (the plan author wired `.run` on each handler so you don't need the emulator for unit tests).
- [ ] TDD discipline.
- [ ] One session commit at the end: `feat(timer): serverStartTs + TimerUI + validate/split/nonces + offline replay`
- [ ] `npm run lint && npm test && npm run build` green in BOTH `apps/web` AND `apps/functions` before commit.

## Files you will create

### Web (`apps/web`)

| Path | Purpose |
|---|---|
| `src/features/timer/serverAnchor.ts` | Client wrapper for `sessionStart` callable |
| `src/features/timer/TimerUI.tsx` | Circular SVG ring + breathing + controls + Welcome-back toast |
| `src/features/timer/StudyScreen.tsx` | Route page that mounts `<TimerUI uid={uid} />` |
| `src/features/timer/stopAndSubmit.ts` | Submit + IndexedDB queue + online replay |
| `src/lib/time/bst.ts` | Pure BST midnight split |
| `tests/features/timer/serverAnchor.test.ts` | Wrapper test |
| `tests/features/timer/TimerUI.test.tsx` | mm:ss render + Pause button enabled when running |
| `tests/features/timer/bstMidnightSplit.test.ts` | Session-across-midnight split |
| `tests/features/timer/stopAndSubmit.test.ts` | Online queue + offline replay |

### Functions (`apps/functions`)

| Path | Purpose |
|---|---|
| `src/sessionStart.ts` | Cloud Function — anchor write |
| `src/processStudySession.ts` | Cloud Function — validate + split + leaderboard + chapterStats |
| `src/presenceNonce.ts` | Cloud Function — issue nonce + `newNonce()` helper |
| `src/emitNonce.ts` | Scheduled — every 5 min, pick a random active session |
| `tests/sessionStart.test.ts` | Cloud Function unit test (uses `.run`) |
| `tests/processStudySession.test.ts` | Cloud Function unit test (uses `.run`) |
| `tests/presenceNonce.test.ts` | `newNonce()` shape test |

## Files you will modify

| Path | Change |
|---|---|
| `apps/functions/src/index.ts` | Export the four new functions |
| `apps/web/src/features/timer/useTimer.ts` | Call `callSessionStart` in `start`; pass `uid` everywhere |
| `apps/web/src/app/router.tsx` | Add `/study` route mounting `<StudyScreen uid={userUidFromAuth()} />` |
| `apps/web/package.json` | Add `date-fns@^3.6.0`, `date-fns-tz@^3.1.3` |

## Step-by-step execution

---

### Step 1: Sanity-check the working tree

```bash
cd F:/Studytracker
git status
git branch --show-current
ls apps/web/src/features/timer
ls apps/functions/src
```

Expected: clean tree, branch = `plan2/session2-server-anchored-timer`, all Session 1 files present.

---

### Step 2: Install web dependencies

```bash
cd F:/Studytracker/apps/web
npm i date-fns@^3.6.0 date-fns-tz@^3.1.3
```

Verify both in `dependencies`.

---

### Step 3: Inspect functions package

```bash
cd F:/Studytracker/apps/functions
cat package.json
cat src/index.ts
```

Confirm `firebase-functions`, `firebase-admin`, and `vitest` are installed. Note the test script — if there's no `npm test`, stop and ask before continuing.

---

### Step 4: Task T6 (do this first — `bst.ts` is needed by `processStudySession`)

**4a. Write the failing test FIRST.**

Create `apps/web/tests/features/timer/bstMidnightSplit.test.ts` with EXACT contents from plan §T6 Step 2:

```ts
import { describe, it, expect } from 'vitest';
import { splitByLocalMidnight } from '@/lib/time/bst';

describe('splitByLocalMidnight (Asia/Dhaka)', () => {
  it('a 60-min session from 23:30 to 00:30 splits into 30 + 30', () => {
    const segs = splitByLocalMidnight(
      new Date('2026-07-29T23:30:00+06:00').getTime(),
      new Date('2026-07-30T00:30:00+06:00').getTime(),
      'Asia/Dhaka',
    );
    expect(segs).toHaveLength(2);
    expect(segs[0].date).toBe('2026-07-29');
    expect(segs[0].durationSec).toBe(30 * 60);
    expect(segs[1].date).toBe('2026-07-30');
    expect(segs[1].durationSec).toBe(30 * 60);
  });

  it('a session entirely on one day does not split', () => {
    const segs = splitByLocalMidnight(
      new Date('2026-07-29T10:00:00+06:00').getTime(),
      new Date('2026-07-29T11:00:00+06:00').getTime(),
      'Asia/Dhaka',
    );
    expect(segs).toHaveLength(1);
    expect(segs[0].date).toBe('2026-07-29');
    expect(segs[0].durationSec).toBe(3600);
  });
});
```

**4b. Run — verify it FAILS** (module not found).

**4c. Implement `apps/web/src/lib/time/bst.ts`** with EXACT contents from plan §T6 Step 3 (note: the `Segment` type, `dateKey`, `tzMidnightMs`, `splitByLocalMidnight`, `nextDateKey` functions exactly as written).

**4d. Run — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/bstMidnightSplit.test.ts
```

---

### Step 5: Task T4 — `sessionStart` Cloud Function + client wrapper

**5a. Write the Cloud Function test FIRST.**

Create `apps/functions/tests/sessionStart.test.ts` with EXACT contents from plan §T4 Step 1:

```ts
import { describe, it, expect, vi } from 'vitest';

const set = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({ doc: () => ({ set }) }),
}));

import { sessionStart } from '../src/sessionStart';

describe('sessionStart', () => {
  it('writes { serverStartTs, clientStartTs } and returns serverStartTs', async () => {
    const before = Date.now();
    const out = await sessionStart.run(
      { data: { clientStartTs: 123 } },
      { auth: { uid: 'u1' } } as never,
    );
    expect(out.serverStartTs).toBeGreaterThanOrEqual(before);
    expect(set).toHaveBeenCalled();
  });
});
```

**5b. Run — verify it FAILS.**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/sessionStart.test.ts
```

**5c. Implement `apps/functions/src/sessionStart.ts`** with EXACT contents from plan §T4 Step 2. Critical bits:
- `onCall<{ clientStartTs: number }>(innerHandler)` with `(innerHandler as any).run = ...` so the unit test works without the emulator.
- Throws `HttpsError('unauthenticated', 'Sign in first')` if `request.auth` is missing.
- Writes `{ serverStartTs, clientStartTs, updatedAt: FieldValue.serverTimestamp() }` with `{ merge: true }`.

**5d. Update `apps/functions/src/index.ts`** to export it:

```ts
export { sessionStart } from './sessionStart.js';
```

(Preserve any existing exports. If there are no existing exports, this line alone is fine.)

**5e. Run — verify PASS.**

**5f. Write the client wrapper test FIRST.**

Create `apps/web/tests/features/timer/serverAnchor.test.ts` with EXACT contents from plan §T4 Step 3.

**5g. Run — verify it FAILS.**

**5h. Implement `apps/web/src/features/timer/serverAnchor.ts`** with EXACT contents from plan §T4 Step 3.

**5i. Run — verify PASS.**

---

### Step 6: Wire `sessionStart` into `useTimer.start`

Modify `apps/web/src/features/timer/useTimer.ts` `start` callback per plan §T4 Step 4. Add the import at the top:

```ts
import { callSessionStart } from './serverAnchor';
```

Replace the `start` useCallback so it awaits `callSessionStart(startTs)` after the local state update and catches network errors silently (they will be filled by background sync — see Session 2 of the plan re. offline path; for now just catch and ignore).

---

### Step 7: Task T7 — Presence nonce system (do BEFORE processStudySession because it imports `newNonce`)

**7a. Write the failing test FIRST.**

Create `apps/functions/tests/presenceNonce.test.ts` with EXACT contents from plan §T7 Step 1 (two tests: regex shape + uniqueness).

**7b. Run — verify it FAILS.**

**7c. Implement `apps/functions/src/presenceNonce.ts`** with EXACT contents from plan §T7 Step 2. Includes:
- `newNonce()` 12-char alphanumeric helper.
- `onCall<{}>(issue)` with `(issue as any).run = ...` test hook.

**7d. Implement `apps/functions/src/emitNonce.ts`** with EXACT contents from plan §T7 Step 3. Uses `onSchedule({ schedule: '*/5 * * * *', timeZone: 'Asia/Dhaka' }, ...)`. Picks one random active session, writes a nonce doc under its `pendingNonces` subcollection.

**7e. Update `apps/functions/src/index.ts`** to export both:

```ts
export { presenceNonce } from './presenceNonce.js';
export { emitNonce } from './emitNonce.js';
```

**7f. Run + build — verify PASS.**

```bash
cd F:/Studytracker/apps/functions
npm test
npm run build
```

---

### Step 8: Task T6 (cont.) — `processStudySession` Cloud Function

**8a. Write the failing test FIRST.**

Create `apps/functions/tests/processStudySession.test.ts` with EXACT contents from plan §T6 Step 6. The test mocks `firebase-admin` with `collection`, `doc`, `FieldValue`, `Timestamp`.

**8b. Run — verify it FAILS** (module not found or runtime error).

**8c. Implement `apps/functions/src/processStudySession.ts`** with EXACT contents from plan §T6 Step 5. Critical constants:

```ts
const TZ = 'Asia/Dhaka';
const MAX_DURATION_SEC = 6 * 3600;
const MIN_DURATION_SEC = 10;
const DAILY_CAP = 10;
const OVERLAP_GRACE_SEC = 10;
```

Required checks (in order):
1. Unauthenticated → `HttpsError('unauthenticated', ...)`.
2. `durationSec < MIN || durationSec > MAX` → `invalid-argument`.
3. `|serverStartTs - clientStartTs| > 5*60_000` → `failed-precondition` (`clock drift`).
4. Overlap with previous session → `failed-precondition`.
5. Daily cap (count `users/{uid}/sessions where date == seg.date`) → `resource-exhausted`.
6. Nonce count `>= max(1, floor(ceil(duration/600)/2))` valid echoes (echoedAt - issuedAt ≤ 90_000 ms) → `failed-precondition`.

On success, write per-day session docs + atomic increments on `analytics/leaderboard_daily/{date}` + `analytics/leaderboard_daily/{date}/users/{uid}` + (if chapterId) `users/{uid}/chapterStats/{chapterId}`.

Important: the handler must expose `.run = ...` per plan for unit testing — keep that line.

The plan imports `splitByLocalMidnight` from `'../../web/src/lib/time/bst.js'` — confirm that relative path works in your functions tsconfig (it should — Functions often imports shared web code this way; if the build fails, ask the user before changing the import).

**8d. Update `apps/functions/src/index.ts`**:

```ts
export { processStudySession } from './processStudySession.js';
```

**8e. Run + build — verify PASS.**

---

### Step 9: Task T5 — `TimerUI` (circular SVG + breathing) + `StudyScreen` route

**9a. Write the failing UI test FIRST.**

Create `apps/web/tests/features/timer/TimerUI.test.tsx` with EXACT contents from plan §T5 Step 1. Note the mock pattern for `useTimer`.

**9b. Run — verify it FAILS** (component not found).

**9c. Inspect the design tokens.**

Read `apps/web/tailwind.config.ts` and any global CSS to confirm the CSS variables `--primary`, `--surface-2`, `--bg`, `--text` exist. If they don't, the TimerUI styles will fall back to defaults — note this and proceed (Plan 3 handles the full palette).

**9d. Implement `apps/web/src/features/timer/TimerUI.tsx`** with EXACT contents from plan §T5 Step 2. Highlights:
- Circular SVG ring of size 280, ring width 8.
- `dash = CIRC * progress` where `progress = min(1, elapsed / (60*60*1000))`.
- Start/Pause/Resume/Stop buttons (Start only when `idle`, Pause when `running`, Resume when `paused`, Stop when not `idle`).
- `breathe` keyframe animation while running.
- `Welcome back` toast appears when tab was hidden > 5 s.

**9e. Implement `apps/web/src/features/timer/StudyScreen.tsx`** with EXACT contents from plan §T5 Step 3 — a one-liner that renders `<TimerUI uid={uid} />`.

**9f. Wire the route.**

Modify `apps/web/src/app/router.tsx`. Inside the protected route children, add:

```tsx
{ path: 'study', element: <StudyScreen uid={userUidFromAuth()} /> }
```

Use whatever `uid`-from-auth pattern Plan 1 established (likely a context). Look at how `TasksScreen` or similar routes get their uid and copy that pattern. If the pattern is unclear, ask the user.

**9g. Run UI test + build — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/TimerUI.test.tsx
npm run build
```

---

### Step 10: Task T8 — `stopAndSubmit` (offline queue drain)

**10a. Write the failing test FIRST.**

Create `apps/web/tests/features/timer/stopAndSubmit.test.ts` with EXACT contents from plan §T8 Step 1.

**10b. Run — verify it FAILS.**

**10c. Implement `apps/web/src/features/timer/stopAndSubmit.ts`** with EXACT contents from plan §T8 Step 2. Highlights:
- `stopAndSubmit(s)` — try callable, catch → enqueue + return `{ ok: true, sessionIds: [], queued: true }`.
- `replayPending(uid)` — iterate queue items where `uid` matches, try callable, on success remove from queue.
- Registers `window.addEventListener('online', ...)` ONCE that reads `window.__hscUid` (set by the auth context — wire this in a later step; for now it just no-ops when undefined).

**10d. Run — verify PASS.**

---

### Step 11: Full verification sweep

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build

cd F:/Studytracker/apps/functions
npm run lint   # only if a lint script exists; otherwise skip
npm test
npm run build
```

Expected: all green. If `apps/functions` has no lint script, that's fine — skip it. If `apps/web` lint surfaces warnings that are pre-existing (not introduced by your changes), note them but proceed.

Coverage check on new files:

```bash
cd F:/Studytracker/apps/web
npm test -- --coverage tests/features/timer
```

Expected: ≥80% lines on `serverAnchor.ts`, `TimerUI.tsx`, `stopAndSubmit.ts`, `lib/time/bst.ts`. Add tests if short.

---

### Step 12: Single session commit

```bash
cd F:/Studytracker
git add apps/web apps/functions
git status   # verify: only timer + functions changes are staged
git commit -m "feat(timer): serverStartTs + TimerUI + validate/split/nonces + offline replay"
```

Commit message subject line is non-negotiable.

---

### Step 13: Push and report

```bash
cd F:/Studytracker
git push -u origin plan2/session2-server-anchored-timer
```

Then output:

```
Session 2 complete.

Branch: plan2/session2-server-anchored-timer
Commit: feat(timer): serverStartTs + TimerUI + validate/split/nonces + offline replay

Shipped:
  ✓ sessionStart Cloud Function (serverStartTs anchor)
  ✓ TimerUI circular SVG ring + breathing animation + Welcome-back toast
  ✓ StudyScreen mounted at /study
  ✓ processStudySession: validate (10s-6h, ±5min drift, overlap, daily cap, nonces) + BST midnight split + atomic leaderboard + chapterStats writes
  ✓ presenceNonce callable + emitNonce every-5-min scheduler
  ✓ stopAndSubmit with online replay drain
  ✓ bst.ts pure split-by-midnight helper

Verification:
  ✓ apps/web: lint + test + build all green
  ✓ apps/functions: test + build green
  ✓ Coverage: ≥80% on new src/features/timer files

Next session:
  Session 3 — Progress + Pace Card (T9 + T10: pace math + PaceCard Recharts radial + ExamCountdown + useBatch).
  Branch from: plan2/session2-server-anchored-timer.
```

---

## What NOT to do

- ❌ Do not implement Tasks T9–T18 (Sessions 3–6).
- ❌ Do not skip the failing-test-first step.
- ❌ Do not modify `firestore.rules` in this session — Session 1 already added the `activeSession` rule.
- ❌ Do not commit broken code.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main`.

## When to stop and ask the user

1. The functions tsconfig cannot resolve `../../web/src/lib/time/bst.js` and you'd need to add path mapping — that's an architectural choice, ask first.
2. The `/study` route pattern (how to get `uid` in router) is genuinely unclear from the existing code.
3. `processStudySession` Cloud Function tests fail because the mocked `firebase-admin` shape doesn't match what the function calls into.
4. The build fails with an unrelated TypeScript error in code you didn't write.
5. Coverage comes out below 80% AND the uncovered lines aren't reachable in any sane test (e.g., 5-line error handler around an edge case the plan doesn't specify).