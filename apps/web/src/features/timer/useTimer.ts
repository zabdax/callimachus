import { useCallback, useEffect, useRef, useState } from 'react';
import { elapsedMs, type Anchor } from './dateNowDelta';
import { saveAnchor, loadAnchor, clearAnchor } from './persistence';
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

  return { status: state.status as TimerStatus, elapsed, start, pause, resume, stop, anchor: state.startTs == null ? null : { startTs: state.startTs, pausedAccumMs: state.pausedAccumMs } satisfies Anchor };
}
