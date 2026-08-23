import { useCallback, useEffect, useRef, useState } from 'react';
import { elapsedMs, type Anchor } from './dateNowDelta';
import { saveAnchor, loadAnchor, clearAnchor, type AnchorRecord } from './persistence';
import { callSessionStart } from './serverAnchor';
import type { TimerState, TimerStatus } from './types';

type Opts = { tickMs?: number; uid?: string };
const idleState: TimerState = { status: 'idle', startTs: null, pausedAccumMs: 0, pausedAt: null };

function stateFromAnchor(anchor: AnchorRecord): TimerState {
  if (anchor.pausedAt != null) {
    return { status: 'paused', startTs: anchor.startTs, pausedAccumMs: anchor.pausedAccumMs, pausedAt: anchor.pausedAt };
  }
  return { status: 'running', startTs: anchor.startTs, pausedAccumMs: anchor.pausedAccumMs, pausedAt: null };
}

export function useTimer(opts: Opts = {}) {
  const { tickMs = 1000, uid } = opts;
  const [state, setState] = useState<TimerState>(() => {
    const anchor = uid ? loadAnchor(uid) : null;
    return anchor ? stateFromAnchor(anchor) : idleState;
  });
  const [anchorRecord, setAnchorRecord] = useState<AnchorRecord | null>(() => (uid ? loadAnchor(uid) : null));
  const [startError, setStartError] = useState(false);
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs mirror the latest state/anchor so async callbacks never read
  // stale render-time values (e.g. a pause that happened while the
  // server start request was still in flight).
  const stateRef = useRef(state);
  stateRef.current = state;
  const anchorRef = useRef(anchorRecord);
  anchorRef.current = anchorRecord;
  // Bumped on reset so a late callSessionStart response can't resurrect
  // a cleared anchor (a ghost "running" session on next visit).
  const generationRef = useRef(0);

  const persist = useCallback((next: TimerState) => {
    if (!uid || next.startTs === null) return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    const record: AnchorRecord = { ...anchor, pausedAccumMs: next.pausedAccumMs, pausedAt: next.pausedAt };
    anchorRef.current = record;
    setAnchorRecord(record);
    saveAnchor(uid, record);
  }, [uid]);

  const start = useCallback(() => {
    const startTs = Date.now();
    const generation = ++generationRef.current;
    setState({ status: 'running', startTs, pausedAccumMs: 0, pausedAt: null });
    setStartError(false);
    if (!uid) {
      const local: AnchorRecord = { startTs, pausedAccumMs: 0, serverStartTs: startTs, sessionId: crypto.randomUUID(), pausedAt: null };
      anchorRef.current = local;
      setAnchorRecord(local);
      return;
    }
    void callSessionStart(startTs).then((server) => {
      // The user may have paused or stopped/reset while the request was in
      // flight — merge the live pause state into the fresh anchor and drop
      // the response entirely if the session was reset.
      if (generation !== generationRef.current || stateRef.current.startTs !== startTs) return;
      const current = stateRef.current;
      const anchor: AnchorRecord = {
        startTs,
        pausedAccumMs: current.pausedAccumMs,
        serverStartTs: server.serverStartTs,
        sessionId: server.sessionId,
        pausedAt: current.pausedAt,
      };
      anchorRef.current = anchor;
      setAnchorRecord(anchor);
      saveAnchor(uid, anchor);
    }).catch(() => {
      if (generation !== generationRef.current) return;
      // Surface immediately — without a server anchor the session can't be
      // saved later, so the user should restart rather than lose an hour.
      setStartError(true);
    });
  }, [uid]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'running' || current.startTs === null) return;
    const next: TimerState = { ...current, status: 'paused', pausedAt: Date.now() };
    setState(next);
    persist(next);
  }, [persist]);

  const resume = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'paused' || current.pausedAt === null) return;
    const next: TimerState = { ...current, status: 'running', pausedAccumMs: current.pausedAccumMs + Date.now() - current.pausedAt, pausedAt: null };
    setState(next);
    persist(next);
  }, [persist]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    if (uid) clearAnchor(uid);
    anchorRef.current = null;
    setAnchorRecord(null);
    setStartError(false);
    setState(idleState);
  }, [uid]);

  useEffect(() => {
    if (state.status === 'idle') return;
    intervalRef.current = setInterval(() => setTick((value) => value + 1), tickMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status, tickMs]);
  useEffect(() => {
    if (state.status === 'idle') return;
    const refresh = () => setTick((value) => value + 1);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [state.status]);

  const elapsed = state.startTs === null ? 0 : elapsedMs({ startTs: state.startTs, pausedAccumMs: state.pausedAccumMs }, state.status === 'paused' && state.pausedAt ? state.pausedAt : Date.now());
  return { status: state.status as TimerStatus, elapsed, start, pause, resume, reset, stop: reset, startError, anchor: state.startTs === null ? null : { startTs: state.startTs, pausedAccumMs: state.pausedAccumMs } satisfies Anchor, record: anchorRecord };
}
