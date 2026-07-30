# Plan 2 — Session 1 Prompt: Timer Core

> **For the agent executing this session:** Read this entire prompt before touching any code. The prompt is self-contained — you should not need to consult the parent plan file (`2026-07-29-timer-and-progress-plan.md`) unless a step references it explicitly.

## Mission

Implement **Plan 2 — Session 1: Timer Core** for the HSC Study Tracker.

This session ships the **client-side foundation** of the focus timer:

1. A `useTimer` React hook that maintains an `idle | running | paused` state machine with **`Date.now()`-anchored elapsed time** (so the displayed time stays accurate even when the browser tab is hidden, throttled, or the OS suspends it).
2. A pure `dateNowDelta.ts` helper that does the elapsed arithmetic (fully unit-tested in isolation).
3. **localStorage + Firestore anchor persistence** so the timer survives full page reloads and writes an `activeSession/current` doc to Firestore with a security rule that allows only the owner to read/write.
4. An **IndexedDB-backed offline queue** (`idb`) for session data with `enqueueSession` / `listPending` / `dropPending` / `removeQueued`.

At the end of this session, `npm test` and `npm run build` are both green in `apps/web`, the security rules unit test passes, and **one** Git commit captures the entire milestone.

## Source-of-truth plan

This session rolls up atomic tasks **T1, T2, and T3** from:
`F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

You must follow the **same exact code, file paths, naming, and test expectations** that those tasks specify. Do not invent new abstractions. If a step says "Create `apps/web/src/features/timer/dateNowDelta.ts` with these contents", use that path verbatim.

## Skill required

Before writing any code, invoke this skill via the `Skill` tool:

- **`superpowers:test-driven-development`** — every code step writes a failing test FIRST, then implements the minimum to make it pass, then refactors. No exceptions. No "I'll add tests later". The failing test must run and fail with the expected error before you write any production code for that step.

If you are tempted to skip TDD ("the test would be trivial", "it's an obvious helper"), you are wrong — write the test first anyway. The discipline is the point.

You may also invoke these when relevant:

- `superpowers:systematic-debugging` — if any test fails unexpectedly
- `superpowers:verification-before-completion` — before the final commit
- `superpowers:using-git-worktrees` — only if you need a true isolated workspace (this session should work on the current branch `feat/plan-1-foundation` directly unless told otherwise)

## Working directory

- Repo root: `F:\Studytracker`
- Web app: `F:\Studytracker\apps\web`
- Tests: `F:\Studytracker\apps\web\tests`

## Branch

Create a fresh feature branch off the current branch (`feat/plan-1-foundation`):

```bash
cd F:/Studytracker
git fetch origin
git switch -c plan2/session1-timer-core
```

If the branch already exists (re-run), check it out instead. Do NOT delete or force-reset.

## Quality bars (must hold)

- [ ] **80% line coverage** on the new `src/features/timer/*` files (run `npm test -- --coverage tests/features/timer` to verify).
- [ ] **100% of new Firestore rules** have positive + negative tests via `@firebase/rules-unit-testing`.
- [ ] **TDD discipline** — failing test runs (and fails with the expected reason) BEFORE the implementation lands.
- [ ] **Single session commit** at the end with message: `feat(timer): Date.now()-anchored state machine + persistence + offline queue`
- [ ] `npm run lint && npm test && npm run build` all green in `apps/web` before commit.

## Files you will create

| Path | Purpose |
|---|---|
| `apps/web/src/features/timer/types.ts` | `TimerStatus`, `TimerState` types |
| `apps/web/src/features/timer/dateNowDelta.ts` | Pure `elapsedMs` calculator |
| `apps/web/src/features/timer/useTimer.ts` | React state machine hook |
| `apps/web/src/features/timer/persistence.ts` | localStorage + Firestore anchor save/load/clear |
| `apps/web/src/features/timer/offlineQueue.ts` | IndexedDB queue via `idb` |
| `apps/web/tests/features/timer/dateNowDelta.test.ts` | Pure elapsed tests |
| `apps/web/tests/features/timer/useTimer.test.ts` | State machine test (fake timers) |
| `apps/web/tests/features/timer/persistence.test.ts` | localStorage round-trip test |
| `apps/web/tests/features/timer/offlineQueue.test.ts` | Queue round-trip test |
| `apps/web/tests/rules/activeSession.test.ts` | Firestore rules test for `users/{uid}/activeSession/current` |

## Files you will modify

| Path | Change |
|---|---|
| `firestore.rules` | Add `match /activeSession/{x} { allow read, write: if isSelf(uid); }` inside the `match /users/{uid}` block |
| `apps/web/package.json` | Add `idb@^8.0.0` (runtime) and `fake-indexeddb@^6.0.0` (dev) |

## Step-by-step execution

Follow these steps in order. Do not skip ahead. Do not skip the test-before-code discipline.

---

### Step 1: Sanity-check the working tree

```bash
cd F:/Studytracker
git status
git branch --show-current
```

Expected: clean tree OR only the `AGENTS.md` file (untracked) that was present at session start. Branch should now be `plan2/session1-timer-core`.

If the working tree has unrelated changes, STOP and ask the user how to proceed.

---

### Step 2: Install runtime + dev dependencies

```bash
cd F:/Studytracker/apps/web
npm i idb@^8.0.0
npm i -D fake-indexeddb@^6.0.0
```

Verify both packages appear in `package.json`:
- `"idb"` in `dependencies`
- `"fake-indexeddb"` in `devDependencies`

---

### Step 3: Task T1 — `dateNowDelta` (pure, with test first)

**3a. Write the failing test first.**

Create `apps/web/tests/features/timer/dateNowDelta.test.ts` with the EXACT contents from plan §T1 Step 1:

```ts
import { describe, it, expect } from 'vitest';
import { elapsedMs } from '@/features/timer/dateNowDelta';

describe('elapsedMs (Date.now()-anchored)', () => {
  it('returns 0 at the exact start', () => {
    const t = 1_000_000;
    expect(elapsedMs({ startTs: t, pausedAccumMs: 0 }, t)).toBe(0);
  });

  it('returns wall-clock delta minus paused accumulation', () => {
    const t = 1_000_000;
    expect(elapsedMs({ startTs: t, pausedAccumMs: 60_000 }, t + 600_000)).toBe(540_000);
  });

  it('is exact even if the tick is delayed (simulated throttling)', () => {
    // start was 1 hour ago; the tick fires NOW
    const startTs = Date.now() - 3_600_000;
    const got = elapsedMs({ startTs, pausedAccumMs: 0 }, Date.now());
    // ±50 ms tolerance for test execution drift
    expect(Math.abs(got - 3_600_000)).toBeLessThan(50);
  });
});
```

**3b. Run the test and verify it FAILS with "Cannot find module" or similar import error.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/dateNowDelta.test.ts
```

Expected: FAIL (module not found — this is the correct "red" state).

**3c. Implement the module.**

Create `apps/web/src/features/timer/dateNowDelta.ts` with EXACT contents:

```ts
export type Anchor = { startTs: number; pausedAccumMs: number };

export function elapsedMs(a: Anchor, nowMs: number): number {
  return Math.max(0, (nowMs - a.startTs) - a.pausedAccumMs);
}
```

**3d. Run the test again — verify it PASSES.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/dateNowDelta.test.ts
```

Expected: 3 tests passed.

---

### Step 4: Task T1 (cont.) — `useTimer` state machine

**4a. Create `apps/web/src/features/timer/types.ts`** (no test needed — pure types):

```ts
export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerState = {
  status: TimerStatus;
  startTs: number | null;
  pausedAccumMs: number;
  pausedAt: number | null;
};
```

**4b. Write the failing state-machine test first.**

Create `apps/web/tests/features/timer/useTimer.test.ts` with EXACT contents from plan §T1 Step 4:

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '@/features/timer/useTimer';

describe('useTimer state machine', () => {
  it('transitions idle → running → paused → running → idle', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer({ tickMs: 100 }));
    expect(result.current.status).toBe('idle');
    act(() => result.current.start());
    expect(result.current.status).toBe('running');
    act(() => result.current.pause());
    expect(result.current.status).toBe('paused');
    act(() => result.current.resume());
    expect(result.current.status).toBe('running');
    act(() => result.current.stop());
    expect(result.current.status).toBe('idle');
    vi.useRealTimers();
  });
});
```

**4c. Run — verify it FAILS** (module not found).

**4d. Implement `useTimer`** — use the EXACT contents from plan §T1 Step 3 (no persistence yet — that comes in Step 5):

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { elapsedMs, type Anchor } from './dateNowDelta';
import type { TimerState, TimerStatus } from './types';

const initial: TimerState = { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };

export function useTimer(opts?: { tickMs?: number }) {
  const tickMs = opts?.tickMs ?? 1000;
  const [state, setState] = useState<TimerState>(initial);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setState({ status: 'running', startTs: Date.now(), pausedAccumMs: 0, pausedAt: null });
  }, []);

  const pause = useCallback(() => {
    setState((s) => s.status !== 'running' ? s : { ...s, status: 'paused', pausedAt: Date.now() });
  }, []);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.status !== 'paused' || s.pausedAt == null) return s;
      const added = Date.now() - s.pausedAt;
      return { ...s, status: 'running', pausedAccumMs: s.pausedAccumMs + added, pausedAt: null };
    });
  }, []);

  const stop = useCallback(() => {
    setState((prev) => {
      if (prev.status === 'running' && prev.pausedAt != null) {
        // shouldn't happen, but normalize
        return { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };
      }
      return initial;
    });
  }, []);

  // The 1Hz tick exists ONLY to drive re-renders. Time truth is Date.now() deltas.
  useEffect(() => {
    if (state.status === 'idle') return;
    intervalRef.current = setInterval(() => setTick((n) => n + 1), tickMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, tickMs]);

  // Page Visibility API: only re-render, NEVER pause.
  useEffect(() => {
    const onVis = () => setTick((n) => n + 1);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  const elapsed = (state.startTs == null)
    ? 0
    : elapsedMs({ startTs: state.startTs, pausedAccumMs: state.pausedAccumMs }, Date.now());

  return { state: state as TimerState, status: state.status as TimerStatus, elapsed, start, pause, resume, stop };
}
```

**4e. Run — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer
```

Expected: 4 tests passed (3 from dateNowDelta + 1 from useTimer).

---

### Step 5: Task T2 — Persistence (localStorage + Firestore + rules)

**5a. Write the Firestore rules test FIRST.**

Create `apps/web/tests/rules/activeSession.test.ts` with EXACT contents from plan §T2 Step 1:

```ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

describe('users/{uid}/activeSession/current rules', () => {
  it('allows the owner to write their own anchor', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u1/activeSession/current'), {
        startTs: 1, pausedAccumMs: 0, serverStartTs: 2, updatedAt: Date.now(),
      }),
    );
  });

  it('forbids other users from writing your anchor', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u1/activeSession/current'), { startTs: 1 }),
    );
  });
});
```

**5b. Run — verify it FAILS** (either rule not found or `u2` succeeds when it shouldn't).

**5c. Add the rule to `firestore.rules`.**

Open `F:/Studytracker/firestore.rules`. Find the `match /users/{uid}` block. Inside it (after the existing `match` statements but before the closing brace), add:

```
    match /activeSession/{x} { allow read, write: if isSelf(uid); }
```

Match the existing indentation style of the file. **Do not delete any existing rules.**

**5d. Run the rules test — verify it PASSES** (both positive and negative cases).

If it fails with "PERMISSION_DENIED" for the owner case, your `isSelf(uid)` helper is broken — check it exists in the rules file and uses the same pattern as the existing `match /users/{uid}` siblings.

**5e. Write the localStorage persistence test FIRST.**

Create `apps/web/tests/features/timer/persistence.test.ts` with EXACT contents from plan §T2 Step 3:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveAnchor, loadAnchor, clearAnchor } from '@/features/timer/persistence';

describe('timer persistence (localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips an anchor', () => {
    const a = { startTs: 1, pausedAccumMs: 2, serverStartTs: 3 };
    saveAnchor('u1', a);
    expect(loadAnchor('u1')).toEqual(a);
  });

  it('clears the anchor', () => {
    saveAnchor('u1', { startTs: 1, pausedAccumMs: 0, serverStartTs: 1 });
    clearAnchor('u1');
    expect(loadAnchor('u1')).toBeNull();
  });
});
```

**5f. Run — verify it FAILS** (module not found).

**5g. Implement `persistence.ts`.**

Create `apps/web/src/features/timer/persistence.ts` with EXACT contents from plan §T2 Step 4:

```ts
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type AnchorRecord = { startTs: number; pausedAccumMs: number; serverStartTs: number };

const LS_KEY = (uid: string) => `hsc:timer:${uid}`;

export function saveAnchor(uid: string, a: AnchorRecord) {
  localStorage.setItem(LS_KEY(uid), JSON.stringify(a));
  void setDoc(doc(getFirestore(app), `users/${uid}/activeSession/current`), {
    ...a, updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function loadAnchor(uid: string): AnchorRecord | null {
  const raw = localStorage.getItem(LS_KEY(uid));
  if (!raw) return null;
  try { return JSON.parse(raw) as AnchorRecord; } catch { return null; }
}

export function clearAnchor(uid: string) {
  localStorage.removeItem(LS_KEY(uid));
  void setDoc(doc(getFirestore(app), `users/${uid}/activeSession/current`), {
    startTs: null, pausedAccumMs: 0, serverStartTs: null, clearedAt: serverTimestamp(),
  }, { merge: true });
}
```

**NOTE**: If `@/lib/firebase/client` does not exist yet (it should from Plan 1), use the relative import pattern that already exists in the codebase. Check `apps/web/src/features/profile/` or similar for the established pattern.

**5h. Run — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/persistence.test.ts
```

**5i. Wire persistence into `useTimer`.**

Replace the contents of `apps/web/src/features/timer/useTimer.ts` with the EXACT version from plan §T2 Step 5 (which includes `loadAnchor` on mount, `saveAnchor` on every transition, `clearAnchor` on stop, and accepts a `uid` option).

**5j. Run all timer tests — verify ALL pass.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer tests/rules/activeSession.test.ts
```

Expected: ALL tests pass.

---

### Step 6: Task T3 — Offline queue (IndexedDB via `idb`)

**6a. Write the failing test FIRST.**

Create `apps/web/tests/features/timer/offlineQueue.test.ts` with EXACT contents from plan §T3 Step 2:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueSession, listPending, dropPending, type QueuedSession } from '@/features/timer/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => { await dropPending(); });

  it('enqueue → listPending → dropPending round-trip', async () => {
    const s: QueuedSession = { id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null };
    await enqueueSession(s);
    const list = await listPending();
    expect(list).toEqual([s]);
    await dropPending();
    expect(await listPending()).toEqual([]);
  });
});
```

**6b. Run — verify it FAILS** (module not found).

**6c. Implement `offlineQueue.ts`.**

Create `apps/web/src/features/timer/offlineQueue.ts` with EXACT contents from plan §T3 Step 3:

```ts
import { openDB, type IDBPDatabase } from 'idb';

export type QueuedSession = {
  id: string;
  uid: string;
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  chapterId: string | null;
};

const DB_NAME = 'hsc-timer';
const STORE = 'pending-sessions';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) { if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' }); },
    });
  }
  return dbp;
}

export async function enqueueSession(s: QueuedSession) {
  const d = await db();
  await d.put(STORE, s);
}

export async function listPending(): Promise<QueuedSession[]> {
  const d = await db();
  return (await d.getAll(STORE)) as QueuedSession[];
}

export async function dropPending() {
  const d = await db();
  await d.clear(STORE);
}

export async function removeQueued(id: string) {
  const d = await db();
  await d.delete(STORE, id);
}
```

**6d. Run — verify PASS.**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/offlineQueue.test.ts
```

---

### Step 7: Full verification sweep

Run the full quality gate before committing:

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build
```

Expected:
- Lint: no errors (warnings ok if they pre-existed)
- All tests pass
- Build succeeds

If anything is red, fix it BEFORE the commit. Do not commit broken code.

Also verify coverage:

```bash
cd F:/Studytracker/apps/web
npm test -- --coverage tests/features/timer
```

Expected: ≥80% lines on the new files (`dateNowDelta.ts`, `useTimer.ts`, `persistence.ts`, `offlineQueue.ts`). If under, add tests — do not lower the bar.

---

### Step 8: Single session commit

```bash
cd F:/Studytracker
git add apps/web firestore.rules
git status   # verify: only timer + rules changes are staged
git commit -m "feat(timer): Date.now()-anchored state machine + persistence + offline queue"
```

The commit message is non-negotiable. If you want a body, add one — but the subject line is locked.

---

### Step 9: Push the branch and report

```bash
cd F:/Studytracker
git push -u origin plan2/session1-timer-core
```

Then output a final report to the user:

```
Session 1 complete.

Branch: plan2/session1-timer-core
Commit: feat(timer): Date.now()-anchored state machine + persistence + offline queue

Shipped:
  ✓ useTimer hook (idle | running | paused) with Date.now()-anchored elapsed
  ✓ dateNowDelta pure helper (3 tests)
  ✓ localStorage + Firestore anchor persistence + owner-only rules
  ✓ IndexedDB offline queue via idb (enqueue / list / drop / remove)
  ✓ Visibility/focus listeners installed (never pause)

Verification:
  ✓ npm run lint  — clean
  ✓ npm test      — all timer + rules tests pass
  ✓ npm run build — succeeds
  ✓ Coverage      — ≥80% on new src/features/timer/* files

Next session:
  Session 2 — Server-Anchored Timer (sessionStart CF + TimerUI + processStudySession + nonces + stopAndSubmit).
  Branch from: plan2/session1-timer-core (the branch you just pushed).
```

---

## What NOT to do

- ❌ Do not invoke `superpowers:brainstorming` — this prompt IS the design.
- ❌ Do not invoke `superpowers:writing-plans` — this session IS a plan slice.
- ❌ Do not implement any task from Sessions 2–6. Stay strictly in scope.
- ❌ Do not commit broken code, even temporarily.
- ❌ Do not skip the failing-test-first step. Ever.
- ❌ Do not modify `package-lock.json` separately from the `npm i` commands above.
- ❌ Do not change the session commit message.
- ❌ Do not merge to `main` — only push the branch.

## When to stop and ask the user

Stop and ask the user (do NOT auto-resolve) if you hit any of these:

1. The `isSelf(uid)` helper in `firestore.rules` does not exist or is broken and you cannot fix it without changing unrelated rules.
2. The `@/lib/firebase/client` module does not exist and there is no clear pattern to follow.
3. Any of the tests fail with an error that suggests the test setup itself is wrong (e.g., Vitest can't find `@/` alias) — this is a config issue, not a logic issue.
4. `npm run build` fails with a TypeScript error that doesn't match any file you created.
5. Coverage comes out below 80% AND you cannot figure out how to test the uncovered lines.

Otherwise, work through every step to completion.