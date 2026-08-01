import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';
import { splitByLocalMidnight } from '../time/bst';
import { assertDriftWithinTolerance } from './sessionStart';

const TZ = 'Asia/Dhaka';
const MAX_DURATION_SEC = 6 * 3600;
const MIN_DURATION_SEC = 10;
const DAILY_CAP = 10;
const OVERLAP_GRACE_SEC = 10;
const NONCE_WINDOW_MS = 90_000;

export type PresenceNonce = { id: string; issuedAt: number; echoedAt: number };

export type ProcessSessionInput = {
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  chapterId?: string | null;
  presenceNonces?: PresenceNonce[];
};

export type ProcessSessionOutput = { ok: true; sessionIds: string[] };

/**
 * Pure handler: validate + persist a study session with anti-cheat
 * guards (overlap, daily cap, presence nonces, clock drift).
 *
 * Returns the ids of the per-day segment docs that were written.
 */
export async function processStudySession(
  uid: string,
  input: ProcessSessionInput,
  db: FirestoreAdapter,
  ua: string,
): Promise<ProcessSessionOutput> {
  const {
    clientStartTs,
    clientEndedTs,
    serverStartTs,
    chapterId = null,
    presenceNonces = [],
  } = input;

  const durationSec = Math.floor((clientEndedTs - clientStartTs) / 1000);
  if (durationSec < MIN_DURATION_SEC || durationSec > MAX_DURATION_SEC) {
    throw new WorkerError(
      'invalid-argument',
      `durationSec=${durationSec} out of range [${MIN_DURATION_SEC}, ${MAX_DURATION_SEC}]`,
    );
  }

  assertDriftWithinTolerance(serverStartTs, clientStartTs);

  // Overlap check
  const lastEndedAt = await db.getLastSessionEndedAt(uid);
  if (lastEndedAt !== null) {
    if (clientStartTs < lastEndedAt - OVERLAP_GRACE_SEC * 1000) {
      throw new WorkerError(
        'failed-precondition',
        'overlap with previous session',
      );
    }
  }

  // Daily cap per BST segment
  const segs = splitByLocalMidnight(clientStartTs, clientEndedTs, TZ);
  for (const seg of segs) {
    const count = await db.countTodaySessions(uid, seg.date);
    if (count >= DAILY_CAP) {
      throw new WorkerError(
        'resource-exhausted',
        `daily cap hit on ${seg.date}`,
      );
    }
  }

  // Nonce check (≥ ceil(duration/600) nonces, ≥ half of those fresh)
  const expectedNonces = Math.ceil(durationSec / 600);
  const validNonces = presenceNonces.filter(
    (n) => n.echoedAt - n.issuedAt <= NONCE_WINDOW_MS,
  );
  if (
    validNonces.length < Math.max(1, Math.floor(expectedNonces / 2))
  ) {
    throw new WorkerError(
      'failed-precondition',
      'insufficient presence nonces',
    );
  }

  // Persist
  for (const seg of segs) {
    const id = `${seg.date}-${seg.startMs}`;
    await db.writeSession(uid, id, {
      startedAtMs: seg.startMs,
      endedAtMs: seg.endMs,
      durationSec: seg.durationSec,
      date: seg.date,
      presenceChecks: validNonces.length,
      device: { ua, platform: 'web' },
      createdAt: { __serverTimestamp: true },
      chapterId,
    });
    await db.incrementDailyLeaderboard(seg.date, seg.durationSec, uid);
    if (chapterId) {
      await db.incrementChapterStat(uid, chapterId, seg.durationSec);
    }
  }

  return { ok: true, sessionIds: segs.map((s) => `${s.date}-${s.startMs}`) };
}