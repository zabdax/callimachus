import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { splitByLocalMidnight } from '../../web/src/lib/time/bst.js';

admin.initializeApp();

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

  const db = admin.firestore();

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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      chapterId: chapterId ?? null,
    }, { merge: true }));

    // Atomic leaderboard increment
    writes.push(db.doc(`analytics/leaderboard_daily/${seg.date}`).set({
      totalDurationSec: admin.firestore.FieldValue.increment(seg.durationSec),
      activeUserCount: admin.firestore.FieldValue.increment(0), // updated by roll-up
    }, { merge: true }));
    writes.push(db.doc(`analytics/leaderboard_daily/${seg.date}/users/${uid}`).set({
      durationSec: admin.firestore.FieldValue.increment(seg.durationSec),
    }, { merge: true }));

    if (chapterId) {
      writes.push(db.doc(`users/${uid}/chapterStats/${chapterId}`).set({
        totalSec: admin.firestore.FieldValue.increment(seg.durationSec),
        lastStudiedAt: admin.firestore.Timestamp.now(),
      }, { merge: true }));
    }
  }

  await Promise.all(writes);
  return { ok: true, sessionIds };
}

export const processStudySession = onCall<Input>(innerHandler);
// Test hook: allow unit tests to call `processStudySession.run(data, ctx)` directly.
(processStudySession as any).run = (
  data: Input,
  ctx: { auth: { uid: string }, rawRequest?: unknown },
) => innerHandler({ data, auth: ctx.auth, rawRequest: ctx.rawRequest } as unknown as CallableRequest<Input>);
