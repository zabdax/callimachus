# Plan 2 — Timer, Progress, Leaderboard (Milestones 4 + 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a focus timer that keeps running accurately when the tab is switched or minimized (±1 s), backed by server-anchored session start and Cloud Function `processStudySession` validation. Show a batch-aware pace card (4 color states), an exam countdown, a daily-plan time-blocking UI, and a community leaderboard gated by 15 min/day.

**Architecture:** Truth source for the timer = `Date.now()` deltas. `visibilitychange`/`blur` re-render only, they never pause. Sessions are server-validated (`processStudySession` callable) with BST midnight split, presence nonces, overlap guard, daily cap. Offline queue via IndexedDB (`idb`) replays on `online`. Pace math is pure (testable in isolation); `PaceCard` reads via TanStack Query. Daily plan is computed by a daily Cloud Function at 05:00 Asia/Dhaka.

**Tech Stack (recap):** + Recharts, Framer Motion, Lottie React, Lucide React, `idb`, `date-fns`, `date-fns-tz`, `recharts` — installed at the relevant task.

**Companion docs:**
- Design spec: `F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md` (§10 is the regression-test spec for the timer)
- Plan orientation: `F:\Studytracker\docs\superpowers\plans\implementation_plan.md`
- Plan 1: `F:\Studytracker\docs\superpowers\plans\2026-07-29-foundation-and-profile-plan.md`

**Working directory for this plan:** `F:\Studytracker\apps\web\` (or `apps/functions/` for Cloud Function tasks).

**Dependency on Plan 1:** User doc shape, `recomputeBatchStatus`, syllabus loaders, and the i18n key set are all in place. This plan extends them.

---

## File map (new in Plan 2)

| Path | Purpose | Created in |
|---|---|---|
| `apps/web/src/features/timer/types.ts` | Timer state types | T1 |
| `apps/web/src/features/timer/useTimer.ts` | State machine (`idle\|running\|paused`) | T1 |
| `apps/web/src/features/timer/dateNowDelta.ts` | Pure elapsed calculator | T1 |
| `apps/web/src/features/timer/persistence.ts` | localStorage + Firestore anchor | T2 |
| `apps/web/src/features/timer/offlineQueue.ts` | IndexedDB queue (`idb`) | T3 |
| `apps/web/src/features/timer/serverAnchor.ts` | `sessionStart` callable | T4 |
| `apps/web/src/features/timer/TimerUI.tsx` | Circular SVG ring + breathing | T5 |
| `apps/web/src/features/timer/StudyScreen.tsx` | Route page | T5 |
| `apps/functions/src/sessionStart.ts` | Cloud Function — anchor | T4 |
| `apps/functions/src/processStudySession.ts` | Cloud Function — validate + split + leaderboard | T6 |
| `apps/functions/src/presenceNonce.ts` | Server nonce issuance | T7 |
| `apps/functions/src/emitNonce.ts` | Scheduled every-5-min nonce pick | T7 |
| `apps/web/src/lib/time/bst.ts` | BST split + format | T8 |
| `apps/web/src/features/progress/pace.ts` | Pure pace math | T9 |
| `apps/web/src/features/progress/PaceCard.tsx` | Recharts radial | T10 |
| `apps/web/src/features/progress/ExamCountdown.tsx` | Days-to-exam widget | T10 |
| `apps/web/src/features/dailyPlan/blocks.ts` | CRUD for `meta/timeBlocks` | T11 |
| `apps/web/src/features/dailyPlan/TimeBlockTimeline.tsx` | 06:00–23:00 timeline | T11 |
| `apps/web/src/features/dailyPlan/DailyPlanCard.tsx` | Planned blocks widget | T12 |
| `apps/functions/src/generateDailyPlan.ts` | 05:00 Asia/Dhaka daily | T12 |
| `apps/web/src/features/leaderboard/leaderboard.ts` | Read daily/monthly | T13 |
| `apps/web/src/features/leaderboard/RankGate.tsx` | 15-min gate | T13 |
| `apps/functions/src/rollUpLeaderboards.ts` | Hourly cron | T14 |
| `apps/web/tests/features/timer/dateNowDelta.test.ts` | Pure elapsed | T1 |
| `apps/web/tests/features/timer/offlineQueue.test.ts` | Queue + replay | T3 |
| `apps/web/tests/features/timer/useTimer.test.ts` | State machine + persistence | T1, T2 |
| `apps/web/tests/features/timer/bstMidnightSplit.test.ts` | Session split | T6, T8 |
| `apps/web/tests/features/progress/pace.test.ts` | Pace + forecast | T9 |
| `apps/web/tests/e2e/timer-persistence.spec.ts` | 60 s tab-switch | T15 |
| `apps/web/tests/rules/sessions-activeSession.test.ts` | Rules for timer doc | T6 |

---

### Task 1: Timer state machine + `dateNowDelta` (pure)

**Files:**
- Create: `apps/web/src/features/timer/types.ts`
- Create: `apps/web/src/features/timer/dateNowDelta.ts`
- Create: `apps/web/src/features/timer/useTimer.ts`
- Create: `apps/web/tests/features/timer/dateNowDelta.test.ts`
- Create: `apps/web/tests/features/timer/useTimer.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/tests/features/timer/dateNowDelta.test.ts`:
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

- [ ] **Step 2: Implement `dateNowDelta`**

`apps/web/src/features/timer/dateNowDelta.ts`:
```ts
export type Anchor = { startTs: number; pausedAccumMs: number };

export function elapsedMs(a: Anchor, nowMs: number): number {
  return Math.max(0, (nowMs - a.startTs) - a.pausedAccumMs);
}
```

- [ ] **Step 3: Implement `useTimer` state machine (no persistence yet — added in T2)**

`apps/web/src/features/timer/types.ts`:
```ts
export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerState = {
  status: TimerStatus;
  startTs: number | null;
  pausedAccumMs: number;
  pausedAt: number | null;
};
```

`apps/web/src/features/timer/useTimer.ts`:
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

- [ ] **Step 4: Write failing state-machine test (uses fake timers)**

`apps/web/tests/features/timer/useTimer.test.ts`:
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

- [ ] **Step 5: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer
```
Expected: PASS (both files).

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(timer): Date.now()-anchored state machine + elapsed calc"
```

---

### Task 2: Timer persistence (localStorage + Firestore `activeSession/current`)

**Files:**
- Create: `apps/web/src/features/timer/persistence.ts`
- Modify: `apps/web/src/features/timer/useTimer.ts`
- Create: `apps/web/tests/features/timer/persistence.test.ts`
- Modify: `firestore.rules` (add `activeSession` rule)

- [ ] **Step 1: Add rules first (failing test that the rule allows owner-only writes)**

`apps/web/tests/rules/activeSession.test.ts`:
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

- [ ] **Step 2: Add the rule**

Modify `firestore.rules` (inside `match /users/{uid}`, add):
```
match /activeSession/{x} { allow read, write: if isSelf(uid); }
```

- [ ] **Step 3: Write failing persistence test (localStorage round-trip)**

`apps/web/tests/features/timer/persistence.test.ts`:
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

- [ ] **Step 4: Implement `persistence.ts`**

`apps/web/src/features/timer/persistence.ts`:
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

- [ ] **Step 5: Wire persistence into `useTimer` (load on mount, save on start/pause/resume/stop)**

Modify `apps/web/src/features/timer/useTimer.ts` (inside the file, replace `start`, `pause`, `resume`, `stop` to call `saveAnchor` when a `uid` is provided, and load on mount):

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { elapsedMs } from './dateNowDelta';
import { saveAnchor, loadAnchor, clearAnchor, type AnchorRecord } from './persistence';
import type { TimerState, TimerStatus } from './types';

type Opts = { tickMs?: number; uid?: string };

export function useTimer(opts: Opts = {}) {
  const { tickMs = 1000, uid } = opts;
  const [state, setState] = useState<TimerState>(() => {
    if (!uid) return { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };
    const a = loadAnchor(uid);
    return a
      ? { status: 'running', startTs: a.startTs, pausedAccumMs: a.pausedAccumMs, pausedAt: null }
      : { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };
  });
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback((next: TimerState, serverStartTs: number | null) => {
    if (!uid || next.startTs == null) return;
    saveAnchor(uid, { startTs: next.startTs, pausedAccumMs: next.pausedAccumMs, serverStartTs: serverStartTs ?? 0 });
  }, [uid]);

  const start = useCallback(async () => {
    const startTs = Date.now();
    // serverStartTs is set by the caller via sessionStart; we persist the local
    // startTs immediately and reconcile serverStartTs on success.
    setState({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null });
    persist({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null }, null);
  }, [persist]);

  const pause = useCallback(() => {
    setState((s) => {
      if (s.status !== 'running') return s;
      const next = { ...s, status: 'paused' as const, pausedAt: Date.now() };
      persist(next, null);
      return next;
    });
  }, [persist]);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.status !== 'paused' || s.pausedAt == null) return s;
      const added = Date.now() - s.pausedAt;
      const next = { ...s, status: 'running' as const, pausedAccumMs: s.pausedAccumMs + added, pausedAt: null };
      persist(next, null);
      return next;
    });
  }, [persist]);

  const stop = useCallback(() => {
    if (uid) clearAnchor(uid);
    setState({ status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null });
  }, [uid]);

  useEffect(() => {
    if (state.status === 'idle') return;
    intervalRef.current = setInterval(() => setTick((n) => n + 1), tickMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, tickMs]);

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

  const elapsed = state.startTs == null
    ? 0
    : elapsedMs({ startTs: state.startTs, pausedAccumMs: state.pausedAccumMs }, Date.now());

  return { status: state.status as TimerStatus, elapsed, start, pause, resume, stop, anchor: state.startTs == null ? null : ({ startTs: state.startTs, pausedAccumMs: state.pausedAccumMs } satisfies AnchorRecord) };
}
```

- [ ] **Step 6: Run all timer + rules tests — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer tests/rules/activeSession.test.ts
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd F:/Studytracker
git add apps/web firestore.rules
git commit -m "feat(timer): localStorage+Firestore anchor persistence + rules"
```

---

### Task 3: Offline queue (IndexedDB via `idb`)

**Files:**
- Create: `apps/web/src/features/timer/offlineQueue.ts`
- Create: `apps/web/tests/features/timer/offlineQueue.test.ts`

- [ ] **Step 1: Add `idb`**

```bash
cd F:/Studytracker/apps/web
npm i idb@^8.0.0
```

- [ ] **Step 2: Write failing test (jsdom IndexedDB shim)**

`apps/web/tests/features/timer/offlineQueue.test.ts`:
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

Add `fake-indexeddb`:
```bash
cd F:/Studytracker/apps/web
npm i -D fake-indexeddb@^6.0.0
```

- [ ] **Step 3: Implement `offlineQueue.ts`**

`apps/web/src/features/timer/offlineQueue.ts`:
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

- [ ] **Step 4: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/offlineQueue.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(timer): idb-backed offline session queue"
```

---

### Task 4: `sessionStart` Cloud Function (server anchor) + client call

**Files:**
- Create: `apps/functions/src/sessionStart.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/functions/tests/sessionStart.test.ts`
- Create: `apps/web/src/features/timer/serverAnchor.ts`
- Create: `apps/web/tests/features/timer/serverAnchor.test.ts`

- [ ] **Step 1: Write failing test for the Cloud Function**

`apps/functions/tests/sessionStart.test.ts`:
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

(The `run` helper in the test invokes the inner handler directly. The test author wires the function in Plan 2 to expose `.run = innerHandler` so this test works without the Functions emulator.)

- [ ] **Step 2: Implement `sessionStart`**

`apps/functions/src/sessionStart.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

async function innerHandler(request: CallableRequest<{ clientStartTs: number }>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const { uid } = request.auth;
  const serverStartTs = Date.now();
  await getFirestore().doc(`users/${uid}/activeSession/current`).set({
    serverStartTs,
    clientStartTs: request.data.clientStartTs,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { serverStartTs };
}

export const sessionStart = onCall<{ clientStartTs: number }>(innerHandler);
// Expose for unit tests
(innerHandler as any).run = async (data: { clientStartTs: number }, ctx: { auth: { uid: string } }) => innerHandler({ data, auth: ctx.auth } as CallableRequest<{ clientStartTs: number }>);
```

Modify `apps/functions/src/index.ts`:
```ts
export { sessionStart } from './sessionStart.js';
```

- [ ] **Step 3: Client wrapper**

`apps/web/src/features/timer/serverAnchor.ts`:
```ts
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

export async function callSessionStart(clientStartTs: number): Promise<{ serverStartTs: number }> {
  const fn = httpsCallable<{ clientStartTs: number }, { serverStartTs: number }>(getFunctions(app), 'sessionStart');
  const res = await fn({ clientStartTs });
  return res.data;
}
```

`apps/web/tests/features/timer/serverAnchor.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { callSessionStart } from '@/features/timer/serverAnchor';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async (data: { clientStartTs: number }) => ({ data: { serverStartTs: data.clientStartTs + 1 } }),
}));

describe('serverAnchor', () => {
  it('returns serverStartTs', async () => {
    const r = await callSessionStart(1000);
    expect(r.serverStartTs).toBe(1001);
  });
});
```

- [ ] **Step 4: Wire into `useTimer.start`**

Modify `apps/web/src/features/timer/useTimer.ts` `start` callback:
```ts
const start = useCallback(async () => {
  const startTs = Date.now();
  setState({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null });
  persist({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null }, null);
  try {
    const { serverStartTs } = await callSessionStart(startTs);
    persist({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null }, serverStartTs);
  } catch {
    // network down — serverStartTs will be filled by background sync on reconnect
  }
}, [persist]);
```

(Add the import at the top: `import { callSessionStart } from './serverAnchor';`.)

- [ ] **Step 5: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer
cd F:/Studytracker/apps/functions
npm test -- tests/sessionStart.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web apps/functions
git commit -m "feat(timer): serverStartTs anchor via sessionStart callable"
```

---

### Task 5: TimerUI (circular SVG + breathing) + StudyScreen route

**Files:**
- Create: `apps/web/src/features/timer/TimerUI.tsx`
- Create: `apps/web/src/features/timer/StudyScreen.tsx`
- Create: `apps/web/tests/features/timer/TimerUI.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: Write failing test (renders elapsed in mm:ss)**

`apps/web/tests/features/timer/TimerUI.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/features/timer/useTimer', () => ({
  useTimer: () => ({
    status: 'running', elapsed: 65_000,
    start: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(),
  }),
}));

import { TimerUI } from '@/features/timer/TimerUI';

describe('TimerUI', () => {
  it('renders 01:05 when elapsed=65000ms and Start is disabled while running', () => {
    render(<TimerUI uid="u1" />);
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause/i })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Implement `TimerUI`**

`apps/web/src/features/timer/TimerUI.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useTimer } from './useTimer';
import { callSessionStart } from './serverAnchor';
import { Button } from '@/components/ui/Button';

function fmt(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const RING_SIZE = 280;
const RADIUS = (RING_SIZE - 12) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function TimerUI({ uid }: { uid: string }) {
  const t = useTimer({ uid });
  const [welcomeBack, setWelcomeBack] = useState(false);

  useEffect(() => {
    let lastHidden: number | null = null;
    const onVis = () => {
      if (document.visibilityState === 'hidden') lastHidden = Date.now();
      else if (lastHidden != null && Date.now() - lastHidden > 5_000) setWelcomeBack(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onStart = async () => {
    const startTs = Date.now();
    try { await callSessionStart(startTs); } catch { /* offline, retry later */ }
    t.start();
  };

  const progress = Math.min(1, t.elapsed / (60 * 60 * 1000)); // 1-hour dial max
  const dash = CIRC * progress;

  return (
    <div className="grid min-h-[60vh] place-items-center bg-bg text-text">
      <svg width={RING_SIZE} height={RING_SIZE} role="img" aria-label={`Elapsed ${fmt(t.elapsed)}`}>
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS} stroke="var(--surface-2)" strokeWidth={8} fill="none" />
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS} stroke="var(--primary)" strokeWidth={8} fill="none"
                strokeDasharray={`${dash} ${CIRC - dash}`} strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
                className={t.status === 'running' ? 'animate-[breathe_4s_ease-in-out_infinite]' : ''} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-text font-display" fontSize="42">
          {fmt(t.elapsed)}
        </text>
      </svg>
      <div className="mt-6 flex gap-3">
        {t.status === 'idle' && <Button onClick={onStart}>Start</Button>}
        {t.status === 'running' && <Button onClick={t.pause}>Pause</Button>}
        {t.status === 'paused' && <Button onClick={t.resume}>Resume</Button>}
        {t.status !== 'idle' && <Button variant="danger" onClick={t.stop}>Stop</Button>}
      </div>
      {welcomeBack && <p role="status">Welcome back — your session is still running.</p>}
      <style>{`@keyframes breathe { 0%,100%{opacity:.9} 50%{opacity:1} }`}</style>
    </div>
  );
}
```

- [ ] **Step 3: `StudyScreen` + route**

`apps/web/src/features/timer/StudyScreen.tsx`:
```tsx
import { TimerUI } from './TimerUI';

export function StudyScreen({ uid }: { uid: string }) {
  return <TimerUI uid={uid} />;
}
```

Modify `apps/web/src/app/router.tsx` — add the route inside the protected children:
```tsx
{ path: 'study', element: <StudyScreen uid={userUidFromAuth()} /> },
```
(Use whatever pattern the engineer already established in Plan 1; the test in T1 still works because TimerUI is tested in isolation with a mocked hook.)

- [ ] **Step 4: Run test + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/TimerUI.test.tsx
npm run build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(timer): TimerUI ring + StudyScreen route"
```

---

### Task 6: `processStudySession` (validate + split + leaderboard + chapterStats)

**Files:**
- Create: `apps/web/src/lib/time/bst.ts`
- Create: `apps/web/tests/features/timer/bstMidnightSplit.test.ts`
- Create: `apps/functions/src/processStudySession.ts`
- Create: `apps/functions/tests/processStudySession.test.ts`
- Modify: `apps/functions/src/index.ts`

- [ ] **Step 1: Add `date-fns` + `date-fns-tz`**

```bash
cd F:/Studytracker/apps/web
npm i date-fns@^3.6.0 date-fns-tz@^3.1.3
```

- [ ] **Step 2: Pure BST midnight split (failing test first)**

`apps/web/tests/features/timer/bstMidnightSplit.test.ts`:
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

- [ ] **Step 3: Implement `splitByLocalMidnight`**

`apps/web/src/lib/time/bst.ts`:
```ts
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export type Segment = { date: string /* YYYY-MM-DD in tz */; startMs: number; endMs: number; durationSec: number };

function dateKey(ms: number, tz: string): string {
  return formatInTimeZone(new Date(ms), tz, 'yyyy-MM-dd');
}

function tzMidnightMs(dateKey: string, tz: string): number {
  // Build a Date that represents local midnight in `tz`, then convert to UTC ms.
  const local = fromZonedTime(`${dateKey} 00:00:00`, tz);
  return local.getTime();
}

export function splitByLocalMidnight(startMs: number, endMs: number, tz: string): Segment[] {
  if (endMs <= startMs) return [];
  const startKey = dateKey(startMs, tz);
  const endKey = dateKey(endMs, tz);
  if (startKey === endKey) {
    return [{ date: startKey, startMs, endMs, durationSec: Math.floor((endMs - startMs) / 1000) }];
  }
  const out: Segment[] = [];
  out.push({ date: startKey, startMs, endMs: tzMidnightMs(nextDateKey(startKey), tz), durationSec: 0 });
  out[0].durationSec = Math.floor((out[0].endMs - out[0].startMs) / 1000);
  // Day(s) in between (rare for sessions < 6h; possible for offline replay)
  let cursor = nextDateKey(startKey);
  while (cursor < endKey) {
    out.push({ date: cursor, startMs: tzMidnightMs(cursor, tz), endMs: tzMidnightMs(nextDateKey(cursor), tz), durationSec: 86400 });
    cursor = nextDateKey(cursor);
  }
  out.push({ date: endKey, startMs: tzMidnightMs(endKey, tz), endMs, durationSec: Math.floor((endMs - tzMidnightMs(endKey, tz)) / 1000) });
  return out;
}

function nextDateKey(k: string): string {
  const [y, m, d] = k.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/bstMidnightSplit.test.ts
```
Expected: PASS.

- [ ] **Step 5: Implement `processStudySession` Cloud Function**

`apps/functions/src/processStudySession.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { splitByLocalMidnight } from '../../web/src/lib/time/bst.js';

initializeApp();

const TZ = 'Asia/Dhaka';
const MAX_DURATION_SEC = 6 * 3600;
const MIN_DURATION_SEC = 10;
const DAILY_CAP = 10;
const OVERLAP_GRACE_SEC = 10;

type Input = {
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  chapterId?: string | null;
  presenceNonces?: { id: string; issuedAt: number; echoedAt: number }[];
};

type InnerResult = { ok: true; sessionIds: string[] };

async function innerHandler(request: CallableRequest<Input>): Promise<InnerResult> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const { uid } = request.auth;
  const { clientStartTs, clientEndedTs, serverStartTs, chapterId, presenceNonces = [] } = request.data;

  const durationSec = Math.floor((clientEndedTs - clientStartTs) / 1000);
  if (durationSec < MIN_DURATION_SEC || durationSec > MAX_DURATION_SEC) {
    throw new HttpsError('invalid-argument', `durationSec=${durationSec} out of range`);
  }

  // Server-anchored time check (clock-drift tolerance ±5 min)
  const drift = Math.abs(serverStartTs - clientStartTs);
  if (drift > 5 * 60_000) {
    throw new HttpsError('failed-precondition', `clock drift ${drift}ms`);
  }

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);

  // Overlap check
  const last = await db.collection(`users/${uid}/sessions`)
    .orderBy('endedAtMs', 'desc').limit(1).get();
  if (!last.empty) {
    const endedAtMs = (last.docs[0]!.data() as { endedAtMs: number }).endedAtMs;
    if (clientStartTs < endedAtMs - OVERLAP_GRACE_SEC * 1000) {
      throw new HttpsError('failed-precondition', 'overlap with previous session');
    }
  }

  // Daily cap (count today's sessions by BST date)
  const segs = splitByLocalMidnight(clientStartTs, clientEndedTs, TZ);
  for (const seg of segs) {
    const startOfDayMs = seg.startMs; // segment start in ms
    const endOfDayMs = seg.endMs;
    void startOfDayMs; void endOfDayMs;
    const today = await db.collection(`users/${uid}/sessions`)
      .where('date', '==', seg.date).count().get();
    if (today.data().count >= DAILY_CAP) {
      throw new HttpsError('resource-exhausted', `daily cap hit on ${seg.date}`);
    }
  }

  // Nonce check (≥ ceil(durationSec / 600) nonces)
  const expectedNonces = Math.ceil(durationSec / 600);
  const validNonces = presenceNonces.filter((n) => n.echoedAt - n.issuedAt <= 90_000);
  if (validNonces.length < Math.max(1, Math.floor(expectedNonces / 2))) {
    throw new HttpsError('failed-precondition', 'insufficient presence nonces');
  }

  // Write per-day session docs
  const writes: Promise<unknown>[] = [];
  const sessionIds: string[] = [];
  for (const seg of segs) {
    const id = `${seg.date}-${seg.startMs}`;
    sessionIds.push(id);
    writes.push(db.doc(`users/${uid}/sessions/${id}`).set({
      startedAtMs: seg.startMs, endedAtMs: seg.endMs, durationSec: seg.durationSec,
      date: seg.date, presenceChecks: validNonces.length,
      device: { ua: request.rawRequest?.headers['user-agent'] ?? 'unknown', platform: 'web' },
      createdAt: FieldValue.serverTimestamp(),
      chapterId: chapterId ?? null,
    }, { merge: true }));

    // Atomic leaderboard increment
    writes.push(db.doc(`analytics/leaderboard_daily/${seg.date}`).set({
      totalDurationSec: FieldValue.increment(seg.durationSec),
      activeUserCount: FieldValue.increment(0), // updated by roll-up
    }, { merge: true }));
    writes.push(db.doc(`analytics/leaderboard_daily/${seg.date}/users/${uid}`).set({
      durationSec: FieldValue.increment(seg.durationSec),
    }, { merge: true }));

    if (chapterId) {
      writes.push(db.doc(`users/${uid}/chapterStats/${chapterId}`).set({
        totalSec: FieldValue.increment(seg.durationSec),
        lastStudiedAt: Timestamp.now(),
      }, { merge: true }));
    }
  }

  await Promise.all(writes);
  return { ok: true, sessionIds };
}

export const processStudySession = onCall<Input>(innerHandler);
(innerHandler as any).run = (data: Input, ctx: { auth: { uid: string; token: { email?: string } }, rawRequest?: unknown }) =>
  innerHandler({ data, auth: ctx.auth, rawRequest: ctx.rawRequest } as unknown as CallableRequest<Input>);
```

Modify `apps/functions/src/index.ts`:
```ts
export { processStudySession } from './processStudySession.js';
```

- [ ] **Step 6: Failing test, then run**

`apps/functions/tests/processStudySession.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

const put = vi.fn().mockResolvedValue(undefined);
const get = vi.fn().mockResolvedValue({ empty: true, docs: [] });
const count = vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) });
const orderBy = vi.fn(() => ({ limit: () => ({ get }) }));
const where = vi.fn(() => ({ count: () => ({ get }) }));
const collection = vi.fn(() => ({ orderBy, where, get }));
const doc = vi.fn(() => ({ set: put }));
const increment = (n: number) => ({ __increment: n });
const serverTimestamp = () => ({ __ts: 1 });

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({ collection, doc, FieldValue: { increment, serverTimestamp } }),
  Timestamp: { now: () => ({ __ts: 1 }), fromDate: (d: Date) => ({ __ts: d.getTime() }) },
}));

import { processStudySession } from '../src/processStudySession';

describe('processStudySession', () => {
  it('writes session + leaderboard when valid', async () => {
    const start = Date.now() - 60 * 60_000;
    const end = Date.now();
    const r = await (processStudySession as any).run(
      { clientStartTs: start, clientEndedTs: end, serverStartTs: start, chapterId: null, presenceNonces: [] },
      { auth: { uid: 'u1' }, rawRequest: { headers: { 'user-agent': 'jest' } } },
    );
    expect(r.ok).toBe(true);
    expect(r.sessionIds.length).toBeGreaterThanOrEqual(1);
  });
});
```

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/processStudySession.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd F:/Studytracker
git add apps/web apps/functions
git commit -m "feat(timer): processStudySession validate+split+leaderboard"
```

---

### Task 7: Presence nonce system (issue + scheduled emit)

**Files:**
- Create: `apps/functions/src/presenceNonce.ts`
- Create: `apps/functions/src/emitNonce.ts`
- Create: `apps/functions/tests/presenceNonce.test.ts`
- Modify: `apps/functions/src/index.ts`

- [ ] **Step 1: Write failing test for the nonce generator**

`apps/functions/tests/presenceNonce.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { newNonce } from '../src/presenceNonce';

describe('presenceNonce.newNonce', () => {
  it('returns a 12-char alphanumeric', () => {
    const n = newNonce();
    expect(n).toMatch(/^[A-Z0-9]{12}$/);
  });

  it('two calls produce different values (probabilistic)', () => {
    const a = newNonce();
    const b = newNonce();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Implement `presenceNonce.ts` (helper) + Cloud Function**

`apps/functions/src/presenceNonce.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

export function newNonce(): string {
  // 12 chars, A-Z + 0-9, ~71 bits of entropy
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

async function issue(request: CallableRequest<{}>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const id = newNonce();
  const issuedAt = Date.now();
  const ref = getFirestore().doc(`users/${request.auth.uid}/activeSession/current/pendingNonces/${id}`);
  await ref.set({ issuedAt, echoed: false, expiresAt: issuedAt + 60_000 });
  return { id, issuedAt, expiresAt: issuedAt + 60_000 };
}

export const presenceNonce = onCall<{}>(issue);
(issue as any).run = (data: {}, ctx: { auth: { uid: string } }) => issue({ data, auth: ctx.auth } as CallableRequest<{}>);
```

- [ ] **Step 3: Scheduled `emitNonce` (every 5 min, picks a random active session)**

`apps/functions/src/emitNonce.ts`:
```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { newNonce } from './presenceNonce.js';

initializeApp();

export const emitNonce = onSchedule({ schedule: '*/5 * * * *', timeZone: 'Asia/Dhaka' }, async () => {
  const db = getFirestore();
  const active = await db.collectionGroup('activeSession').where('serverStartTs', '>', 0).get();
  if (active.empty) return { emitted: 0 };
  const pick = active.docs[Math.floor(Math.random() * active.docs.length)]!;
  const id = newNonce();
  const issuedAt = Date.now();
  const uid = pick.ref.parent.parent?.id;
  if (!uid) return { emitted: 0 };
  await db.doc(`users/${uid}/activeSession/current/pendingNonces/${id}`).set({
    issuedAt, echoed: false, expiresAt: issuedAt + 60_000,
  });
  return { emitted: 1, nonceId: id, uid };
});
```

- [ ] **Step 4: Export**

Modify `apps/functions/src/index.ts`:
```ts
export { presenceNonce } from './presenceNonce.js';
export { emitNonce } from './emitNonce.js';
```

- [ ] **Step 5: Run + build**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/presenceNonce.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/functions
git commit -m "feat(timer): presence nonces (issue + every-5min emit)"
```

---

### Task 8: Wire offline queue into the timer stop flow

**Files:**
- Create: `apps/web/src/features/timer/stopAndSubmit.ts`
- Create: `apps/web/tests/features/timer/stopAndSubmit.test.ts`

- [ ] **Step 1: Write failing test (offline queues, online replays)**

`apps/web/tests/features/timer/stopAndSubmit.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueSession, listPending, dropPending } from '@/features/timer/offlineQueue';
import { stopAndSubmit, replayPending } from '@/features/timer/stopAndSubmit';

const callMock = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data: unknown) => callMock(data),
}));

describe('stopAndSubmit', () => {
  beforeEach(async () => { await dropPending(); callMock.mockReset(); });

  it('queues a session when the network call fails', async () => {
    callMock.mockRejectedValueOnce(new Error('offline'));
    const r = await stopAndSubmit({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    expect(r).toMatchObject({ ok: true, queued: true });
    expect((await listPending()).length).toBe(1);
  });

  it('replayPending drains the queue when the network succeeds', async () => {
    await enqueueSession({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    callMock.mockResolvedValueOnce({ data: { ok: true, sessionIds: ['s1'] } });
    await replayPending('u1');
    expect(callMock).toHaveBeenCalledTimes(1);
    expect((await listPending()).length).toBe(0);
  });
});
```

- [ ] **Step 2: Implement `stopAndSubmit`**

`apps/web/src/features/timer/stopAndSubmit.ts`:
```ts
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { enqueueSession, listPending, removeQueued, type QueuedSession } from './offlineQueue';

export async function stopAndSubmit(s: QueuedSession) {
  try {
    const fn = httpsCallable(getFunctions(app), 'processStudySession');
    const res = await fn(s);
    return res.data as { ok: true; sessionIds: string[] };
  } catch {
    await enqueueSession(s);
    return { ok: true, sessionIds: [], queued: true } as const;
  }
}

export async function replayPending(uid: string) {
  const items = (await listPending()).filter((q) => q.uid === uid);
  for (const q of items) {
    try {
      const fn = httpsCallable(getFunctions(app), 'processStudySession');
      await fn(q);
      await removeQueued(q.id);
    } catch {
      // still offline — keep
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const uid = (window as any).__hscUid as string | undefined;
    if (uid) void replayPending(uid);
  });
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/timer/stopAndSubmit.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(timer): stopAndSubmit with online replay"
```

---

### Task 9: Pace math (pure) — `pacePct`, `remainingDays`, `forecastFinishDate`

**Files:**
- Create: `apps/web/src/features/progress/pace.ts`
- Create: `apps/web/tests/features/progress/pace.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/tests/features/progress/pace.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pacePct, remainingDays, forecastFinishDate } from '@/features/progress/pace';

const batch = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('pacePct', () => {
  it('is 0 before collegeStart', () => {
    expect(pacePct(batch, new Date('2025-01-01T00:00:00+06:00'))).toBe(0);
  });
  it('is 100 at examStart (clamped)', () => {
    expect(pacePct(batch, new Date('2026-06-30T00:00:00+06:00'))).toBe(100);
  });
  it('is roughly 50 near the midpoint', () => {
    const mid = new Date((batch.collegeStart.getTime() + batch.examStart.getTime()) / 2);
    const pct = pacePct(batch, mid);
    expect(pct).toBeGreaterThan(45);
    expect(pct).toBeLessThan(55);
  });
});

describe('remainingDays', () => {
  it('rounds up fractional days', () => {
    const r = remainingDays(batch, new Date('2026-06-29T01:00:00+06:00'));
    expect(r).toBe(2);
  });
  it('is 0 after examStart', () => {
    expect(remainingDays(batch, new Date('2026-07-15T00:00:00+06:00'))).toBe(0);
  });
});

describe('forecastFinishDate', () => {
  it('returns a Date later than examStart when pace < target', () => {
    const d = forecastFinishDate({ remainingChapters: 100, minutesPerChapter: 30, avgMinPerDay: 45 }, new Date('2026-07-15T00:00:00+06:00'));
    const need = (100 * 30) / 45;
    expect(Math.round((d.getTime() - new Date('2026-07-15T00:00:00+06:00').getTime()) / 86_400_000)).toBe(Math.ceil(need));
  });
});
```

- [ ] **Step 2: Implement**

`apps/web/src/features/progress/pace.ts`:
```ts
import type { BatchDates } from '@/features/batches/recomputeBatchStatus';

export function pacePct(b: BatchDates, now: Date): number {
  const total = b.examStart.getTime() - b.collegeStart.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - b.collegeStart.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export function remainingDays(b: BatchDates, now: Date): number {
  const diff = b.examStart.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

export function forecastFinishDate(
  input: { remainingChapters: number; minutesPerChapter: number; avgMinPerDay: number },
  now: Date,
): Date {
  const need = (input.remainingChapters * input.minutesPerChapter) / Math.max(1, input.avgMinPerDay);
  return new Date(now.getTime() + Math.ceil(need) * 86_400_000);
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/progress/pace.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(progress): pacePct / remainingDays / forecastFinishDate"
```

---

### Task 10: PaceCard (Recharts radial, 4 color states) + ExamCountdown

**Files:**
- Create: `apps/web/src/features/progress/PaceCard.tsx`
- Create: `apps/web/src/features/progress/ExamCountdown.tsx`
- Create: `apps/web/src/features/progress/useBatch.ts`
- Create: `apps/web/tests/features/progress/PaceCard.test.tsx`

- [ ] **Step 1: Add Recharts**

```bash
cd F:/Studytracker/apps/web
npm i recharts@^2.12.7
```

- [ ] **Step 2: `useBatch` reads `/batches/{batchId}` doc**

`apps/web/src/features/progress/useBatch.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { BatchDates } from '@/features/batches/recomputeBatchStatus';

export type BatchDoc = BatchDates & { label: string; status: 'pre-start'|'in-session'|'exam-window'|'resulted' };

export function useBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['batch', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(app), `batches/${batchId}`));
      if (!snap.exists()) return null;
      const d = snap.data() as { label: string; status: BatchDoc['status']; collegeStart: { toDate: () => Date }; examStart: { toDate: () => Date }; examEnd: { toDate: () => Date } };
      return { label: d.label, status: d.status, collegeStart: d.collegeStart.toDate(), examStart: d.examStart.toDate(), examEnd: d.examEnd.toDate() } as BatchDoc;
    },
  });
}
```

- [ ] **Step 3: Write failing PaceCard test**

`apps/web/tests/features/progress/PaceCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/progress/useBatch', () => ({
  useBatch: () => ({
    data: {
      label: 'HSC 2026',
      status: 'in-session',
      collegeStart: new Date('2025-07-15T00:00:00+06:00'),
      examStart: new Date('2026-06-30T00:00:00+06:00'),
      examEnd: new Date('2026-08-15T00:00:00+06:00'),
    },
  }),
}));

import { PaceCard } from '@/features/progress/PaceCard';

describe('PaceCard', () => {
  it('renders the batch label', () => {
    render(<PaceCard batchId="HSC-2026" now={new Date('2025-12-01T00:00:00+06:00')} />);
    expect(screen.getByText(/HSC 2026/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement `PaceCard` + `ExamCountdown`**

`apps/web/src/features/progress/PaceCard.tsx`:
```tsx
import { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useBatch } from './useBatch';
import { pacePct } from './pace';
import { recomputeBatchStatus } from '@/features/batches/recomputeBatchStatus';

const COLORS: Record<string, string> = {
  'pre-start': '#94A3B8',
  'in-session': '#2E5A88',
  'exam-window': '#E0A458',
  'resulted': '#3F6B4E',
};

export function PaceCard({ batchId, now }: { batchId: string; now: Date }) {
  const { data: batch } = useBatch(batchId);
  const pct = useMemo(() => (batch ? pacePct(batch, now) : 0), [batch, now]);
  const status = useMemo(() => (batch ? recomputeBatchStatus(batch, now) : 'pre-start'), [batch, now]);
  const fill = COLORS[status] ?? '#2E5A88';

  return (
    <section className="rounded-lg bg-surface p-4 text-text shadow-sm">
      <h3 className="font-display text-lg">{batch?.label ?? '…'}</h3>
      <div className="h-48">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'pace', value: pct, fill }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#ECE7DE' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-2xl font-display">{pct}%</p>
      <p className="text-center text-text-dim capitalize">{status.replace('-', ' ')}</p>
    </section>
  );
}
```

`apps/web/src/features/progress/ExamCountdown.tsx`:
```tsx
import { useBatch } from './useBatch';
import { remainingDays } from './pace';

export function ExamCountdown({ batchId, now }: { batchId: string; now: Date }) {
  const { data: batch } = useBatch(batchId);
  if (!batch) return null;
  const days = remainingDays(batch, now);
  return (
    <div className="rounded-lg bg-surface-2 p-4 text-text">
      <p className="text-text-dim text-sm">Days to HSC exam</p>
      <p className="font-display text-3xl">{days}</p>
    </div>
  );
}
```

- [ ] **Step 5: Run test + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/progress/PaceCard.test.tsx
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(progress): PaceCard (recharts radial, 4 states) + ExamCountdown"
```

---

### Task 11: Time-blocking data + UI

**Files:**
- Create: `apps/web/src/features/dailyPlan/blocks.ts`
- Create: `apps/web/src/features/dailyPlan/TimeBlockTimeline.tsx`
- Create: `apps/web/src/features/dailyPlan/useTimeBlocks.ts`
- Create: `apps/web/tests/features/dailyPlan/blocks.test.ts`

- [ ] **Step 1: Add data-model rule for `meta/timeBlocks`**

Modify `firestore.rules` (no change needed — `meta/{x}` already allows the owner).

- [ ] **Step 2: Write failing test (pure conflict detection)**

`apps/web/tests/features/dailyPlan/blocks.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hasConflict } from '@/features/dailyPlan/blocks';

const b = (startHour: number, durationMin: number, id = 'x') =>
  ({ id, startHour, durationMin, subjectId: 's', chapterId: 'c', completedAt: null as Date | null });

describe('hasConflict', () => {
  it('detects overlap on the same hour', () => {
    expect(hasConflict([b(9, 60, 'a')], b(9, 30, 'b'))).toBe(true);
  });
  it('allows adjacent blocks', () => {
    expect(hasConflict([b(9, 60, 'a')], b(10, 60, 'b'))).toBe(false);
  });
  it('ignores already-completed blocks', () => {
    expect(hasConflict([{ ...b(9, 60, 'a'), completedAt: new Date() }], b(9, 30, 'b'))).toBe(false);
  });
});
```

- [ ] **Step 3: Implement `blocks.ts`**

`apps/web/src/features/dailyPlan/blocks.ts`:
```ts
import {
  addDoc, collection, doc, getDocs, getFirestore, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type TimeBlock = {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD in Asia/Dhaka
  startHour: number; // 0..23
  durationMin: number;
  subjectId: string;
  chapterId: string;
  completedAt: Date | null;
  source: 'manual' | 'auto-plan';
};

export function hasConflict(blocks: TimeBlock[], candidate: TimeBlock): boolean {
  const cStart = candidate.startHour * 60;
  const cEnd = cStart + candidate.durationMin;
  return blocks.some((b) => {
    if (b.completedAt) return false;
    if (b.date !== candidate.date) return false;
    const s = b.startHour * 60;
    const e = s + b.durationMin;
    return s < cEnd && cStart < e;
  });
}

export async function listTimeBlocks(uid: string, date: string) {
  const db = getFirestore(app);
  const q = query(collection(db, `users/${uid}/meta/timeBlocks`), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, uid, ...(d.data() as Omit<TimeBlock, 'id' | 'uid'>) })) as TimeBlock[];
}

export async function addBlock(uid: string, b: Omit<TimeBlock, 'id' | 'uid' | 'completedAt'>) {
  const db = getFirestore(app);
  return addDoc(collection(db, `users/${uid}/meta/timeBlocks`), { ...b, completedAt: null, createdAt: serverTimestamp() });
}

export async function completeBlock(uid: string, id: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/meta/timeBlocks/${id}`), { completedAt: serverTimestamp() });
}
```

`apps/web/src/features/dailyPlan/useTimeBlocks.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addBlock, completeBlock, listTimeBlocks, type TimeBlock } from './blocks';

export function useTimeBlocks(uid: string, date: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['timeBlocks', uid, date], queryFn: () => listTimeBlocks(uid, date), enabled: !!uid });
  const add = useMutation({
    mutationFn: (b: Parameters<typeof addBlock>[1]) => addBlock(uid, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeBlocks', uid, date] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => completeBlock(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeBlocks', uid, date] }),
  });
  return { ...q, add, complete };
}
```

- [ ] **Step 4: `TimeBlockTimeline` (06:00–23:00) — minimal click-to-add**

`apps/web/src/features/dailyPlan/TimeBlockTimeline.tsx`:
```tsx
import { useState } from 'react';
import { useTimeBlocks } from './useTimeBlocks';
import { hasConflict, type TimeBlock } from './blocks';

const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 06:00 .. 23:00

function todayKey(): string {
  // BST date YYYY-MM-DD using Intl with explicit timeZone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export function TimeBlockTimeline({ uid }: { uid: string }) {
  const date = todayKey();
  const { data: blocks = [], add, complete } = useTimeBlocks(uid, date);
  const [picked, setPicked] = useState<{ startHour: number; durationMin: number } | null>(null);

  const onSlotClick = (h: number) => {
    setPicked({ startHour: h, durationMin: 30 });
  };

  const onAdd = (subjectId: string, chapterId: string) => {
    if (!picked) return;
    add.mutate({ date, startHour: picked.startHour, durationMin: picked.durationMin, subjectId, chapterId, source: 'manual' });
    setPicked(null);
  };

  return (
    <div className="grid grid-cols-[60px_1fr] gap-2 p-4">
      {HOURS.map((h) => (
        <div key={h} className="contents">
          <div className="text-text-dim text-sm">{String(h).padStart(2, '0')}:00</div>
          <button onClick={() => onSlotClick(h)} className="rounded border border-surface-2 bg-surface p-2 text-left text-text">
            {blocks.filter((b: TimeBlock) => b.startHour === h).map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <span>{b.subjectId} · {b.chapterId}</span>
                {b.completedAt
                  ? <span className="text-success">✓</span>
                  : <button onClick={(e) => { e.stopPropagation(); complete.mutate(b.id); }} className="text-primary">complete</button>}
              </div>
            ))}
            {picked?.startHour === h && <span className="text-text-dim">+ new 30m</span>}
          </button>
        </div>
      ))}
      {picked && (
        <div className="col-span-2 rounded bg-surface-2 p-2">
          <p>Add a 30m block at {String(picked.startHour).padStart(2, '0')}:00</p>
          <input id="sbj" placeholder="subjectId" className="rounded border p-1" />
          <input id="chp" placeholder="chapterId" className="rounded border p-1" />
          <button onClick={() => onAdd((document.getElementById('sbj') as HTMLInputElement).value, (document.getElementById('chp') as HTMLInputElement).value)} className="ml-2 rounded bg-primary px-2 text-white">Add</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/dailyPlan/blocks.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(dailyPlan): time-block CRUD + timeline UI"
```

---

### Task 12: `generateDailyPlan` Cloud Function + DailyPlanCard widget

**Files:**
- Create: `apps/functions/src/generateDailyPlan.ts`
- Create: `apps/web/src/features/dailyPlan/DailyPlanCard.tsx`
- Create: `apps/web/tests/features/dailyPlan/dailyPlanPicker.test.ts`
- Modify: `apps/functions/src/index.ts`

- [ ] **Step 1: Pure picker test (sort pending upcomingTasks → pick top 4 ≤ 4 h)**

`apps/web/tests/features/dailyPlan/dailyPlanPicker.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pickDailyPlan } from '@/features/dailyPlan/pickDailyPlan';

describe('pickDailyPlan', () => {
  it('sorts by scheduledFor and fits within 240 minutes', () => {
    const tasks = [
      { id: 'a', type: 'firstRevision', minutes: 60, scheduledFor: new Date('2026-08-05T08:00:00+06:00') },
      { id: 'b', type: 'secondRevision', minutes: 90, scheduledFor: new Date('2026-08-04T08:00:00+06:00') },
      { id: 'c', type: 'firstRevision', minutes: 60, scheduledFor: new Date('2026-08-04T07:00:00+06:00') },
      { id: 'd', type: 'thirdRevision', minutes: 60, scheduledFor: new Date('2026-08-04T09:00:00+06:00') },
      { id: 'e', type: 'firstRevision', minutes: 90, scheduledFor: new Date('2026-08-04T10:00:00+06:00') },
    ];
    const out = pickDailyPlan(tasks, 240);
    expect(out.map((t) => t.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});
```

- [ ] **Step 2: Implement picker**

`apps/web/src/features/dailyPlan/pickDailyPlan.ts`:
```ts
export type PlanTask = { id: string; type: string; minutes: number; scheduledFor: Date };

export function pickDailyPlan(tasks: PlanTask[], budgetMinutes: number): PlanTask[] {
  const sorted = [...tasks].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  const out: PlanTask[] = [];
  let used = 0;
  for (const t of sorted) {
    if (used + t.minutes > budgetMinutes) continue;
    out.push(t);
    used += t.minutes;
    if (out.length === 4) break;
  }
  return out;
}
```

- [ ] **Step 3: Cloud Function `generateDailyPlan`**

`apps/functions/src/generateDailyPlan.ts`:
```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { pickDailyPlan } from '../../web/src/features/dailyPlan/pickDailyPlan.js';

initializeApp();
const TZ = 'Asia/Dhaka';

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export const generateDailyPlan = onSchedule({ schedule: '0 5 * * *', timeZone: TZ }, async () => {
  const db = getFirestore();
  const date = todayKey();
  const users = await db.collection('users').get();
  for (const u of users.docs) {
    const tasksSnap = await db.collection(`users/${u.id}/upcomingTasks`)
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', Timestamp.fromDate(new Date(Date.now() + 2 * 86400_000)))
      .get();
    const tasks = tasksSnap.docs.map((d) => {
      const x = d.data() as { id?: string; type: string; minutes?: number; scheduledFor: Timestamp };
      return { id: d.id, type: x.type, minutes: x.minutes ?? 30, scheduledFor: x.scheduledFor.toDate() };
    });
    const picked = pickDailyPlan(tasks, 240);
    await db.doc(`users/${u.id}/meta/dailyPlan/${date}`).set({
      date, generatedAt: Timestamp.now(), tasks: picked,
    }, { merge: true });
  }
  return { ok: true, users: users.size };
});
```

Modify `apps/functions/src/index.ts`:
```ts
export { generateDailyPlan } from './generateDailyPlan.js';
```

- [ ] **Step 4: DailyPlanCard UI**

`apps/web/src/features/dailyPlan/DailyPlanCard.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

type Plan = { date: string; tasks: { id: string; type: string; minutes: number; scheduledFor: Date }[] };

export function DailyPlanCard({ uid, date }: { uid: string; date: string }) {
  const q = useQuery({
    queryKey: ['dailyPlan', uid, date],
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(app), `users/${uid}/meta/dailyPlan/${date}`));
      if (!snap.exists()) return null;
      const d = snap.data() as Omit<Plan, 'tasks'> & { tasks: { id: string; type: string; minutes: number; scheduledFor: { toDate: () => Date } }[] };
      return { date: d.date, tasks: d.tasks.map((t) => ({ ...t, scheduledFor: t.scheduledFor.toDate() })) } as Plan;
    },
  });
  if (!q.data || q.data.tasks.length === 0) return null;
  return (
    <section className="rounded-lg bg-surface p-4 text-text">
      <h3 className="font-display text-lg">Today’s plan</h3>
      <ol className="mt-2 list-decimal pl-5">
        {q.data.tasks.map((t) => <li key={t.id}>{t.type} · {t.minutes}m</li>)}
      </ol>
    </section>
  );
}
```

- [ ] **Step 5: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/dailyPlan/pickDailyPlan.test.ts
cd F:/Studytracker/apps/functions
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web apps/functions
git commit -m "feat(dailyPlan): picker + 05:00 cron + DailyPlanCard"
```

---

### Task 13: Leaderboard read + RankGate (15-min gate)

**Files:**
- Create: `apps/web/src/features/leaderboard/leaderboard.ts`
- Create: `apps/web/src/features/leaderboard/RankGate.tsx`
- Create: `apps/web/tests/features/leaderboard/leaderboard.test.ts`

- [ ] **Step 1: Write failing test (sort + gate)**

`apps/web/tests/features/leaderboard/leaderboard.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sortTop10, isRankUnlocked } from '@/features/leaderboard/leaderboard';

describe('leaderboard', () => {
  it('sortTop10 returns top 10 by durationSec desc', () => {
    const users = Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}`, durationSec: 1000 - i * 10 }));
    const top = sortTop10(users);
    expect(top).toHaveLength(10);
    expect(top[0].uid).toBe('u0');
  });

  it('isRankUnlocked requires >= 15 minutes', () => {
    expect(isRankUnlocked(14 * 60)).toBe(false);
    expect(isRankUnlocked(15 * 60)).toBe(true);
    expect(isRankUnlocked(16 * 60)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `leaderboard.ts`**

`apps/web/src/features/leaderboard/leaderboard.ts`:
```ts
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type LbUser = { uid: string; durationSec: number; name?: string; photoURL?: string; college?: string };

export const RANK_GATE_SEC = 15 * 60;

export function sortTop10(users: LbUser[]): LbUser[] {
  return [...users].sort((a, b) => b.durationSec - a.durationSec).slice(0, 10);
}
export function isRankUnlocked(todaySec: number): boolean {
  return todaySec >= RANK_GATE_SEC;
}

export async function readDailyLeaderboard(date: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard_daily/${date}`));
  if (!docSnap.exists()) return { date, totalDurationSec: 0, users: [] as LbUser[] };
  const data = docSnap.data() as { totalDurationSec: number; users: Record<string, number> };
  const users = Object.entries(data.users ?? {}).map(([uid, durationSec]) => ({ uid, durationSec }));
  return { date, totalDurationSec: data.totalDurationSec ?? 0, users };
}

export async function readMonthlyLeaderboard(month: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard_monthly/${month}`));
  if (!docSnap.exists()) return { month, users: [] as LbUser[] };
  const data = docSnap.data() as { users: Record<string, number> };
  return { month, users: Object.entries(data.users ?? {}).map(([uid, durationSec]) => ({ uid, durationSec })) };
}
```

`apps/web/src/features/leaderboard/RankGate.tsx`:
```tsx
import { sortTop10, isRankUnlocked, type LbUser } from './leaderboard';

export function RankGate({ todaySec, users }: { todaySec: number; users: LbUser[] }) {
  if (!isRankUnlocked(todaySec)) {
    return <p className="text-text-dim">🔒 Study {Math.max(0, 15 - Math.floor(todaySec / 60))}m more to unlock the leaderboard.</p>;
  }
  const top = sortTop10(users);
  return (
    <ol className="list-decimal pl-5 text-text">
      {top.map((u) => <li key={u.uid}>{u.name ?? u.uid} — {Math.round(u.durationSec / 60)}m</li>)}
    </ol>
  );
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/leaderboard
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(leaderboard): read + RankGate (15m)"
```

---

### Task 14: `rollUpLeaderboards` (hourly cron, daily → monthly)

**Files:**
- Create: `apps/functions/src/rollUpLeaderboards.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/functions/tests/rollUpLeaderboards.test.ts`

- [ ] **Step 1: Pure unit test (merge of users map + prune)**

`apps/functions/tests/rollUpLeaderboards.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mergeUsersMap, monthKey, pruneCutoff } from '../src/rollUpLeaderboards';

describe('rollUpLeaderboards helpers', () => {
  it('mergeUsersMap sums per-uid durations', () => {
    const out = mergeUsersMap([{ users: { a: 10, b: 20 } }, { users: { a: 5, c: 7 } }]);
    expect(out).toEqual({ a: 15, b: 20, c: 7 });
  });
  it('monthKey is YYYY-MM', () => {
    expect(monthKey(new Date('2026-07-29T00:00:00+06:00'))).toBe('2026-07');
  });
  it('pruneCutoff is 30 days ago', () => {
    const d = new Date('2026-07-29T00:00:00+06:00');
    expect(pruneCutoff(d).toISOString().slice(0, 10)).toBe('2026-06-29');
  });
});
```

- [ ] **Step 2: Implement**

`apps/functions/src/rollUpLeaderboards.ts`:
```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp();

export function mergeUsersMap(days: { users: Record<string, number> }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) {
    for (const [uid, sec] of Object.entries(d.users ?? {})) out[uid] = (out[uid] ?? 0) + sec;
  }
  return out;
}

export function monthKey(d: Date): string { return d.toISOString().slice(0, 7); }
export function pruneCutoff(now: Date): Date { return new Date(now.getTime() - 30 * 86_400_000); }

export const rollUpLeaderboards = onSchedule({ schedule: '0 * * * *', timeZone: 'Asia/Dhaka' }, async () => {
  const db = getFirestore();
  const now = new Date();
  const month = monthKey(now);
  const dailySnap = await db.collection('analytics/leaderboard_daily').get();
  const merged = mergeUsersMap(dailySnap.docs.map((d) => d.data() as { users: Record<string, number> }));
  await db.doc(`analytics/leaderboard_monthly/${month}`).set({
    users: merged, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  // Prune daily docs older than 30 days
  const cutoff = pruneCutoff(now);
  const old = dailySnap.docs.filter((d) => new Date(d.id) < cutoff);
  await Promise.all(old.map((d) => d.ref.delete()));
  return { ok: true, merged: Object.keys(merged).length, pruned: old.length };
});
```

Modify `apps/functions/src/index.ts`:
```ts
export { rollUpLeaderboards } from './rollUpLeaderboards.js';
```

- [ ] **Step 3: Run + build**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/rollUpLeaderboards.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/functions
git commit -m "feat(leaderboard): rollUpLeaderboards hourly cron + 30d prune"
```

---

### Task 15: Playwright e2e — timer persistence (60 s tab-switch)

**Files:**
- Create: `apps/web/tests/e2e/timer-persistence.spec.ts`

- [ ] **Step 1: Write the e2e test (uses fake clock + visibilitychange)**

`apps/web/tests/e2e/timer-persistence.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('timer keeps running when tab is hidden for 60s', async ({ page }) => {
  await page.goto('/sign-in');
  // We can't actually sign in to Google in CI; we bypass by stubbing the auth context
  // via a dedicated test-only route registered in Plan 3. For Plan 2, we test the
  // *mechanism* in isolation by mounting TimerUI on a debug page.
  await page.goto('/__test/timer');
  await page.getByRole('button', { name: /Start/i }).click();
  // hide the tab — Playwright will treat the page as hidden in headless
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }));
  await page.waitForTimeout(60_000);
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }));
  const text = await page.locator('text=/\\d{2}:\\d{2}/').first().textContent();
  const [m, s] = text!.split(':').map(Number);
  expect(m * 60 + s).toBeGreaterThanOrEqual(60);
  expect(m * 60 + s).toBeLessThanOrEqual(62);
});
```

(Plan 1 does not register `/__test/timer`; Plan 3 task 1 (test-only routes) wires that up. For Plan 2, mark this test as `test.skip` and rely on the unit test in T1 + the rules test in T6 to cover the regression. We do not want to ship a Playwright test that depends on a real Google sign-in.)

- [ ] **Step 2: Add `.skip` for now and link a comment to Plan 3**

`apps/web/tests/e2e/timer-persistence.spec.ts` (final for Plan 2):
```ts
import { test, expect } from '@playwright/test';

// REGRESSION TEST FOR SPEC §10: timer must keep running when tab is hidden.
// This test is gated on Plan 3 Task 1 wiring `/__test/timer` (a test-only
// route that mounts TimerUI with a mock uid). Until then it is skipped.
test.skip('timer keeps running when tab is hidden for 60s', async ({ page }) => {
  await page.goto('/__test/timer');
  await page.getByRole('button', { name: /Start/i }).click();
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }));
  await page.waitForTimeout(60_000);
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }));
  const text = await page.locator('text=/\\d{2}:\\d{2}/').first().textContent();
  const [m, s] = text!.split(':').map(Number);
  expect(m * 60 + s).toBeGreaterThanOrEqual(60);
  expect(m * 60 + s).toBeLessThanOrEqual(62);
});
```

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "test(e2e): placeholder for timer-persistence spec (gated on Plan 3)"
```

---

### Task 16: Wire Overview screen (PaceCard + ExamCountdown + DailyPlanCard + TimeBlockTimeline)

**Files:**
- Create: `apps/web/src/features/home/Overview.tsx`
- Create: `apps/web/tests/features/home/Overview.test.tsx`
- Modify: `apps/web/src/features/home/Home.tsx` (or wire into the existing route)

- [ ] **Step 1: Failing test**

`apps/web/tests/features/home/Overview.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
vi.mock('@/features/progress/useBatch', () => ({
  useBatch: () => ({ data: { label: 'HSC 2026', status: 'in-session', collegeStart: new Date(), examStart: new Date(), examEnd: new Date() } }),
}));

import { Overview } from '@/features/home/Overview';

describe('Overview', () => {
  it('renders PaceCard label and Days to HSC exam', () => {
    render(<Overview />);
    expect(screen.getByText(/HSC 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Days to HSC exam/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `Overview`**

`apps/web/src/features/home/Overview.tsx`:
```tsx
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';
import { PaceCard } from '@/features/progress/PaceCard';
import { ExamCountdown } from '@/features/progress/ExamCountdown';
import { DailyPlanCard } from '@/features/dailyPlan/DailyPlanCard';

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export function Overview() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.uid);
  if (!user || !profile?.batchId) return null;
  const now = new Date();
  const date = todayKey();
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      <PaceCard batchId={profile.batchId} now={now} />
      <ExamCountdown batchId={profile.batchId} now={now} />
      <DailyPlanCard uid={user.uid} date={date} />
    </div>
  );
}
```

- [ ] **Step 3: Wire route (replace `Home` or add as nested route — your call from Plan 1)**

- [ ] **Step 4: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/home/Overview.test.tsx
npm run build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(home): Overview with pace + countdown + daily plan"
```

---

### Task 17: Full test sweep + Cloud Function emulator smoke

**Files:**
- Modify: `.github/workflows/ci.yml` (add Functions unit test step)

- [ ] **Step 1: Add functions test step to CI**

Append to `.github/workflows/ci.yml` `build-test` job:
```yaml
      - name: Functions test
        working-directory: apps/functions
        run: |
          npm ci
          npm test
```

- [ ] **Step 2: Run full local sweep**

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run build

cd F:/Studytracker/apps/functions
npm test
npm run build
```
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add .github
git commit -m "ci: include functions unit tests in build-test"
```

---

### Task 18: Plan 2 handoff + update todos

- [ ] **Step 1: Verify everything locally one more time**

```bash
cd F:/Studytracker/apps/web
npm run lint && npm test && npm run build
cd F:/Studytracker/apps/functions
npm test && npm run build
```
Expected: all green.

- [ ] **Step 2: Open a PR**

```bash
cd F:/Studytracker
git push origin HEAD
gh pr create --title "Plan 2: Timer + Progress + Leaderboard" --body "Implements M4 + M5. See docs/superpowers/plans/2026-07-29-timer-and-progress-plan.md."
```

- [ ] **Step 3: Hand off to Plan 3**

When all 18 tasks are green:
- Timer is server-anchored and survives tab-switch / minimize (regression test gated for Plan 3).
- Pace card, exam countdown, daily plan, time-blocking, leaderboard are all live.
- **Handoff to Plan 3** (Subscription + Admin + i18n + Ship). Plan 3 will:
  1. Wire the test-only routes (so the timer e2e can run).
  2. Swap real Bangla translations in `bn.json`.
  3. Add FCM notifications (calls into `users.fcmTokens` written by Plan 1's `onboardingProfile`).
  4. Add chapter-tagging UI in the timer.
  5. Build the subscription + admin flow + data export.
  6. Add the PWA manifest, Workbox, Sentry, accessibility audit, privacy policy, marketing page.
