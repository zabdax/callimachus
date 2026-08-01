import type { BatchState } from './handlers/batchStatus';
import { recomputeBatchStatus } from './handlers/batchStatus';

/**
 * All cron handlers share a single entry point so we use only 1 of the
 * 5 free cron slots. The Worker inspects the cron expression to
 * dispatch to the right handler.
 *
 * Cron handlers must be idempotent — we run them every minute/hour/day,
 * so dedupe / no-op behavior matters.
 *
 * Adapters are injected so the cron handlers can be unit-tested
 * without spinning up the Firestore REST client.
 */

export interface CronAdapters {
  now: () => number;
  /** Returns all batches with their date math. */
  listBatches: () => Promise<Array<{ id: string; collegeStart: number; examStart: number; examEnd: number }>>;
  /** Writes the computed status back to /batches/{id}. */
  writeBatchStatus: (id: string, state: BatchState) => Promise<void>;
  /** Lists today's sessions across all users (for leaderboard rollup). */
  listTodaySessions: (date: string) => Promise<Array<{ uid: string; durationSec: number }>>;
  /** Writes the rolled-up leaderboard monthly doc. */
  writeMonthlyLeaderboard: (monthKey: string, totalDurationSec: number, activeUsers: number) => Promise<void>;
  /** Per-user presence nonces — emits a fresh nonce for each active session. */
  listActiveSessions: () => Promise<Array<{ uid: string }>>;
  /** Writes the nonce to KV (or any cache). */
  writeNonce: (uid: string, nonceId: string, expiresAt: number) => Promise<void>;
  /** Lists pending upcomingTasks due in the next hour for push notifications. */
  listUpcomingTasksForReminders: (now: number, oneHourLater: number) => Promise<Array<{ uid: string; subjectId: string; chapterName: string }>>;
  /** Sends an FCM push. Stub for tests. */
  sendPush: (token: string, title: string, body: string, data: Record<string, string>) => Promise<void>;
  /** Returns the FCM tokens for a user. Stub for tests. */
  listFcmTokens: (uid: string) => Promise<string[]>;
  /** Lists pending upcomingTasks for daily plan generation. */
  listPendingTasksForDailyPlan: (uid: string, now: number) => Promise<Array<{ id: string; subjectId: string; scheduledFor: number }>>;
  /** Writes the daily plan to /users/{uid}/meta/dailyPlan. */
  writeDailyPlan: (uid: string, blocks: Array<{ id: string; subjectId: string; scheduledFor: number }>) => Promise<void>;
  /** Lists all uids with profiles. */
  listAllUids: () => Promise<string[]>;
}

/**
 * Top-level handler invoked by Workers on each cron tick.
 * Schedule-aware: inspects the cron name (passed by wrangler) and
 * dispatches to the right routine.
 */
export async function cronTick(
  schedule: string,
  adapters: CronAdapters,
): Promise<{ ran: string; ok: boolean }> {
  const now = adapters.now();
  switch (schedule) {
    case 'DAILY_PLAN':
      await runDailyPlan(adapters, now);
      return { ran: 'dailyPlan', ok: true };
    case 'LEADERBOARD_ROLLUP':
      await runLeaderboardRollup(adapters, now);
      return { ran: 'leaderboardRollup', ok: true };
    case 'BATCH_STATUS':
      await runBatchStatus(adapters, now);
      return { ran: 'batchStatus', ok: true };
    case 'NONCE_AND_REMINDER': {
      await runNonceIssuance(adapters, now);
      await runRevisionReminders(adapters, now);
      return { ran: 'nonceAndReminder', ok: true };
    }
    default:
      return { ran: schedule, ok: false };
  }
}

/* ---------- individual routines ---------- */

async function runBatchStatus(adapters: CronAdapters, now: number): Promise<void> {
  const batches = await adapters.listBatches();
  for (const b of batches) {
    const state = recomputeBatchStatus(now, b.collegeStart, b.examStart, b.examEnd);
    await adapters.writeBatchStatus(b.id, state);
  }
}

async function runLeaderboardRollup(adapters: CronAdapters, now: number): Promise<void> {
  const dateKey = new Date(now).toISOString().slice(0, 10);
  const monthKey = dateKey.slice(0, 7);
  const today = await adapters.listTodaySessions(dateKey);
  const total = today.reduce((acc, s) => acc + s.durationSec, 0);
  const uniqueUsers = new Set(today.map((s) => s.uid)).size;
  await adapters.writeMonthlyLeaderboard(monthKey, total, uniqueUsers);
}

async function runNonceIssuance(adapters: CronAdapters, now: number): Promise<void> {
  const active = await adapters.listActiveSessions();
  const nonceId = crypto.randomUUID();
  // Each nonce is valid for 90s. The client must echo it back within
  // this window during a session (see Plan 2 processStudySession).
  const expiresAt = now + 90_000;
  for (const a of active) {
    await adapters.writeNonce(a.uid, nonceId, expiresAt);
  }
}

async function runRevisionReminders(adapters: CronAdapters, now: number): Promise<void> {
  const oneHourLater = now + 60 * 60 * 1000;
  const tasks = await adapters.listUpcomingTasksForReminders(now, oneHourLater);
  for (const t of tasks) {
    const tokens = await adapters.listFcmTokens(t.uid);
    for (const token of tokens) {
      const safeName = t.chapterName.length > 60
        ? t.chapterName.slice(0, 57) + '…'
        : t.chapterName;
      await adapters.sendPush(
        token,
        'Revision due today',
        `Time to revise: ${safeName}`,
        { subjectId: t.subjectId, chapterName: t.chapterName },
      );
    }
  }
}

async function runDailyPlan(adapters: CronAdapters, now: number): Promise<void> {
  const uids = await adapters.listAllUids();
  for (const uid of uids) {
    const tasks = await adapters.listPendingTasksForDailyPlan(uid, now);
    const blocks = tasks
      .sort((a, b) => a.scheduledFor - b.scheduledFor)
      .slice(0, 4)
      .map((t) => ({ id: t.id, subjectId: t.subjectId, scheduledFor: t.scheduledFor }));
    await adapters.writeDailyPlan(uid, blocks);
  }
}