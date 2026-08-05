import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';
import { splitByLocalMidnight } from '../time/bst';
import { assertDriftWithinTolerance } from './sessionStart';

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
  chapterId?: string | null;
};

export type ProcessSessionOutput = { ok: true; sessionIds: string[] };

export async function processStudySession(
  uid: string,
  input: ProcessSessionInput,
  db: FirestoreAdapter,
  ua: string,
): Promise<ProcessSessionOutput> {
  const { sessionId = '', clientStartTs, clientEndedTs, serverStartTs, chapterId = null } = input;
  if (!Number.isSafeInteger(clientStartTs) || !Number.isSafeInteger(clientEndedTs) || !Number.isSafeInteger(serverStartTs)) {
    throw new WorkerError('invalid-argument', 'invalid session timing data');
  }
  if (chapterId !== null && (!/^[a-zA-Z0-9/_-]{1,120}$/.test(chapterId))) {
    throw new WorkerError('invalid-argument', 'invalid chapterId');
  }

  const active = await db.getActiveSession(uid);
  if (!active || active.sessionId !== sessionId || active.serverStartTs !== serverStartTs || active.clientStartTs !== clientStartTs) {
    throw new WorkerError('failed-precondition', 'active study session not found');
  }

  const durationSec = Math.floor((clientEndedTs - clientStartTs) / 1000);
  if (durationSec < MIN_DURATION_SEC || durationSec > MAX_DURATION_SEC) {
    throw new WorkerError('invalid-argument', `durationSec=${durationSec} out of range [${MIN_DURATION_SEC}, ${MAX_DURATION_SEC}]`);
  }
  assertDriftWithinTolerance(serverStartTs, clientStartTs);

  const lastEndedAt = await db.getLastSessionEndedAt(uid);
  if (lastEndedAt !== null && clientStartTs < lastEndedAt - OVERLAP_GRACE_SEC * 1000) {
    throw new WorkerError('failed-precondition', 'overlap with previous session');
  }

  const segs = splitByLocalMidnight(clientStartTs, clientEndedTs, TZ);
  for (const seg of segs) {
    if (await db.countTodaySessions(uid, seg.date) >= DAILY_CAP) {
      throw new WorkerError('resource-exhausted', `daily cap hit on ${seg.date}`);
    }
  }

  for (const seg of segs) {
    const id = `${seg.date}-${seg.startMs}`;
    await db.writeSession(uid, id, {
      startedAtMs: seg.startMs,
      endedAtMs: seg.endMs,
      durationSec: seg.durationSec,
      date: seg.date,
      presenceChecks: 0,
      device: { ua: ua.slice(0, 256), platform: 'web' },
      createdAt: { __serverTimestamp: true },
      chapterId,
    });
    await db.incrementDailyLeaderboard(seg.date, seg.durationSec, uid);
    if (chapterId) await db.incrementChapterStat(uid, chapterId, seg.durationSec);
  }
  await db.clearActiveSession(uid, sessionId);
  return { ok: true, sessionIds: segs.map((seg) => `${seg.date}-${seg.startMs}`) };
}
