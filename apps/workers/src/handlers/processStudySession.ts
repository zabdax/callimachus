import type { DbAdapter } from '../db';
import { WorkerError } from '../db';
import { splitByLocalMidnight } from '../time/bst';
import { MAX_DRIFT_MS, assertDriftWithinTolerance } from './sessionStart';

const TZ = 'Asia/Dhaka';
const MAX_DURATION_SEC = 6 * 3600;
const MIN_DURATION_SEC = 10;
const DAILY_CAP = 10;
const OVERLAP_GRACE_SEC = 10;

export type ProcessSessionInput = {
  sessionId?: string;
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  /** Total paused time in ms — deducted from the credited duration. */
  pausedAccumMs?: number;
  chapterId?: string | null;
};

export type ProcessSessionOutput = { ok: true; sessionIds: string[] };

export async function processStudySession(
  uid: string,
  input: ProcessSessionInput,
  db: DbAdapter,
  ua: string,
): Promise<ProcessSessionOutput> {
  const { sessionId = '', clientStartTs, clientEndedTs, serverStartTs, pausedAccumMs = 0, chapterId = null } = input;
  if (!Number.isSafeInteger(clientStartTs) || !Number.isSafeInteger(clientEndedTs) || !Number.isSafeInteger(serverStartTs)) {
    throw new WorkerError('invalid-argument', 'invalid session timing data');
  }
  if (!Number.isSafeInteger(pausedAccumMs) || pausedAccumMs < 0) {
    throw new WorkerError('invalid-argument', 'invalid pausedAccumMs');
  }
  if (chapterId !== null && (!/^[a-zA-Z0-9/_-]{1,120}$/.test(chapterId))) {
    throw new WorkerError('invalid-argument', 'invalid chapterId');
  }

  const active = await db.getActiveSession(uid);
  if (!active || active.sessionId !== sessionId || active.serverStartTs !== serverStartTs || active.clientStartTs !== clientStartTs) {
    throw new WorkerError('failed-precondition', 'active study session not found');
  }

  // A session cannot end in the (server's) future. Clamp instead of reject:
  // clients with a fast clock (within the start-drift tolerance) submit an
  // end timestamp slightly ahead of server time, and offline replays are
  // always in the past. Without this, a client could claim up to 6h of
  // credit instantly by submitting a fabricated end timestamp.
  const effectiveEndMs = Math.min(clientEndedTs, Date.now() + MAX_DRIFT_MS);
  const wallMs = effectiveEndMs - clientStartTs;
  if (pausedAccumMs >= wallMs) {
    throw new WorkerError('invalid-argument', 'paused time covers the whole session');
  }
  const studySec = Math.floor((wallMs - pausedAccumMs) / 1000);
  if (studySec < MIN_DURATION_SEC || studySec > MAX_DURATION_SEC) {
    throw new WorkerError('invalid-argument', `durationSec=${studySec} out of range [${MIN_DURATION_SEC}, ${MAX_DURATION_SEC}]`);
  }
  assertDriftWithinTolerance(serverStartTs, clientStartTs);

  const lastEndedAt = await db.getLastSessionEndedAt(uid);
  if (lastEndedAt !== null && clientStartTs < lastEndedAt - OVERLAP_GRACE_SEC * 1000) {
    throw new WorkerError('failed-precondition', 'overlap with previous session');
  }

  const segs = splitByLocalMidnight(clientStartTs, effectiveEndMs, TZ);
  const wallTotalSec = segs.reduce((acc, seg) => acc + seg.durationSec, 0);
  for (const seg of segs) {
    if (await db.countTodaySessions(uid, seg.date) >= DAILY_CAP) {
      throw new WorkerError('resource-exhausted', `daily cap hit on ${seg.date}`);
    }
  }

  // Clear the server-owned active session BEFORE crediting, guarded by the
  // doc's updateTime: two concurrent submissions race here and exactly one
  // wins — the loser aborts without writing sessions or increments. All
  // rejectable checks run above so a rejection never mutates state.
  await db.clearActiveSession(uid, sessionId, active.updateTime);

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;
    // Distribute the pause across segments proportionally to their wall
    // time; the last segment absorbs rounding so totals match exactly.
    const rawSec = wallTotalSec === 0 ? 0 : (seg.durationSec / wallTotalSec) * studySec;
    const creditedSec = i === segs.length - 1
      ? studySec - segs.slice(0, i).reduce((acc, s) => acc + Math.round((s.durationSec / wallTotalSec) * studySec), 0)
      : Math.round(rawSec);
    const id = `${seg.date}-${seg.startMs}`;
    await db.writeSession(uid, id, {
      startedAtMs: seg.startMs,
      endedAtMs: seg.endMs,
      durationSec: creditedSec,
      date: seg.date,
      presenceChecks: 0,
      device: { ua: ua.slice(0, 256), platform: 'web' },
      createdAt: { __serverTimestamp: true },
      chapterId,
    });
    await db.incrementDailyLeaderboard(seg.date, creditedSec, uid);
    if (chapterId) await db.incrementChapterStat(uid, chapterId, creditedSec);
  }
  return { ok: true, sessionIds: segs.map((seg) => `${seg.date}-${seg.startMs}`) };
}
