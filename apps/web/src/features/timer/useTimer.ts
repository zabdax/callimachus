import { useCallback, useEffect, useRef, useState } from 'react';
import { elapsedMs, type Anchor } from './dateNowDelta';
import { saveAnchor, loadAnchor, clearAnchor, type AnchorRecord } from './persistence';
import { callSessionStart } from './serverAnchor';
import type { TimerState, TimerStatus } from './types';

type Opts = { tickMs?: number; uid?: string };
const idleState: TimerState = { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };

export function useTimer(opts: Opts = {}) {
  const { tickMs = 1000, uid } = opts;
  const [state, setState] = useState<TimerState>(() => {
    const anchor = uid ? loadAnchor(uid) : null;
    return anchor ? { status: 'running', startTs: anchor.startTs, pausedAccumMs: anchor.pausedAccumMs, pausedAt: null } : idleState;
  });
  const [anchorRecord, setAnchorRecord] = useState<AnchorRecord | null>(() => uid ? loadAnchor(uid) : null);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persist = useCallback((next: TimerState, anchor: AnchorRecord | null) => {
    if (!uid || next.startTs === null || !anchor) return;
    const record = { ...anchor, pausedAccumMs: next.pausedAccumMs };
    setAnchorRecord(record);
    saveAnchor(uid, record);
  }, [uid]);

  const start = useCallback(async () => {
    const startTs = Date.now();
    setState({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null });
    if (!uid) {
      setAnchorRecord({ startTs, pausedAccumMs: 0, serverStartTs: startTs, sessionId: crypto.randomUUID() });
      return;
    }
    void callSessionStart(startTs).then((server) => {
      const anchor = { startTs, pausedAccumMs: 0, serverStartTs: server.serverStartTs, sessionId: server.sessionId };
      setAnchorRecord(anchor);
      saveAnchor(uid, anchor);
    }).catch(() => undefined);
  }, [uid]);

  const pause = useCallback(() => setState((current) => {
    if (current.status !== 'running') return current;
    const next = { ...current, status: 'paused' as const, pausedAt: Date.now() };
    persist(next, anchorRecord);
    return next;
  }), [anchorRecord, persist]);

  const resume = useCallback(() => setState((current) => {
    if (current.status !== 'paused' || current.pausedAt === null) return current;
    const next = { ...current, status: 'running' as const, pausedAccumMs: current.pausedAccumMs + Date.now() - current.pausedAt, pausedAt: null };
    persist(next, anchorRecord);
    return next;
  }), [anchorRecord, persist]);

  const reset = useCallback(() => {
    if (uid) clearAnchor(uid);
    setAnchorRecord(null);
    setState(idleState);
  }, [uid]);

  useEffect(() => {
    if (state.status === 'idle') return;
    intervalRef.current = setInterval(() => setTick((value) => value + 1), tickMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, tickMs]);
  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, []);

  const elapsed = state.startTs === null ? 0 : elapsedMs({ startTs: state.startTs, pausedAccumMs: state.pausedAccumMs }, state.status === 'paused' && state.pausedAt ? state.pausedAt : Date.now());
  return { status: state.status as TimerStatus, elapsed, start, pause, resume, reset, stop: reset, anchor: state.startTs === null ? null : { startTs: state.startTs, pausedAccumMs: state.pausedAccumMs } satisfies Anchor, record: anchorRecord };
}
