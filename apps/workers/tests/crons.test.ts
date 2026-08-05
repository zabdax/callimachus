import { describe, it, expect, beforeEach } from 'vitest';
import { cronTick, type CronAdapters } from '../src/crons';

class StubAdapters implements CronAdapters {
  now = () => 1_700_000_000_000;
  batches: Array<{ id: string; collegeStart: number; examStart: number; examEnd: number }> = [];
  batchWrites: Array<{ id: string; state: unknown }> = [];
  todaySessions: Array<{ uid: string; durationSec: number }> = [];
  monthlyWrites: Array<{ monthKey: string; total: number; users: number }> = [];
  active: Array<{ uid: string }> = [];
  nonces: Array<{ uid: string; nonceId: string; expiresAt: number }> = [];
  reminderTasks: Array<{ uid: string; subjectId: string; chapterName: string }> = [];
  fcmTokensByUid: Record<string, string[]> = {};
  pushes: Array<{ token: string; title: string; body: string; data: Record<string, string> }> = [];
  pendingTasksByUid: Record<string, Array<{ id: string; subjectId: string; scheduledFor: number }>> = {};
  dailyPlans: Array<{ uid: string; blocks: Array<{ id: string; subjectId: string; scheduledFor: number }> }> = [];
  uids: string[] = [];

  async listBatches() { return this.batches; }
  async writeBatchStatus(id: string, state: unknown) { this.batchWrites.push({ id, state }); }
  async listTodaySessions(_d: string) { return this.todaySessions; }
  async writeMonthlyLeaderboard(monthKey: string, totalDurationSec: number, activeUsers: number) {
    this.monthlyWrites.push({ monthKey, total: totalDurationSec, users: activeUsers });
  }
  async listActiveSessions() { return this.active; }
  async writeNonce(uid: string, nonceId: string, expiresAt: number) {
    this.nonces.push({ uid, nonceId, expiresAt });
  }
  async listUpcomingTasksForReminders(_now: number, _oneHourLater: number) { return this.reminderTasks; }
  async sendPush(token: string, title: string, body: string, data: Record<string, string>) {
    this.pushes.push({ token, title, body, data });
  }
  async listFcmTokens(uid: string) { return this.fcmTokensByUid[uid] ?? []; }
  async listPendingTasksForDailyPlan(uid: string, _now: number) {
    return this.pendingTasksByUid[uid] ?? [];
  }
  async writeDailyPlan(uid: string, blocks: Array<{ id: string; subjectId: string; scheduledFor: number }>) {
    this.dailyPlans.push({ uid, blocks });
  }
  async listAllUids() { return this.uids; }
}

describe('cronTick', () => {
  let a: StubAdapters;
  beforeEach(() => { a = new StubAdapters(); });

  it('BATCH_STATUS: recomputes every batch', async () => {
    a.batches = [
      { id: 'HSC-2026', collegeStart: 1_700_000_000_000 - 365 * 86_400_000, examStart: 1_700_000_000_000 + 30 * 86_400_000, examEnd: 1_700_000_000_000 + 60 * 86_400_000 },
    ];
    const out = await cronTick('BATCH_STATUS', a);
    expect(out.ok).toBe(true);
    expect(a.batchWrites).toHaveLength(1);
    expect(a.batchWrites[0]?.state).toMatchObject({ kind: 'in-session' });
  });

  it('LEADERBOARD_ROLLUP: sums durations + unique users', async () => {
    a.todaySessions = [
      { uid: 'u1', durationSec: 600 },
      { uid: 'u1', durationSec: 300 },
      { uid: 'u2', durationSec: 120 },
    ];
    await cronTick('LEADERBOARD_ROLLUP', a);
    expect(a.monthlyWrites).toHaveLength(1);
    expect(a.monthlyWrites[0]).toMatchObject({ total: 1020, users: 2 });
  });

  it('NONCE_AND_REMINDER: emits nonces for active + pushes for due tasks', async () => {
    a.active = [{ uid: 'u1' }, { uid: 'u2' }];
    a.reminderTasks = [{ uid: 'u1', subjectId: 'physics1', chapterName: 'Vectors' }];
    a.fcmTokensByUid['u1'] = ['tok1', 'tok2'];
    await cronTick('NONCE_AND_REMINDER', a);
    expect(a.nonces).toHaveLength(2);
    expect(a.pushes).toHaveLength(2); // 2 tokens for u1
    expect(a.pushes[0]?.title).toBe('Revision due today');
  });

  it('NONCE_AND_REMINDER: truncates long chapter names', async () => {
    a.reminderTasks = [{ uid: 'u1', subjectId: 's1', chapterName: 'A'.repeat(200) }];
    a.fcmTokensByUid['u1'] = ['tok1'];
    await cronTick('NONCE_AND_REMINDER', a);
    expect(a.pushes[0]?.body.length).toBeLessThan(200);
  });

  it('DAILY_PLAN: writes a plan per uid with up to 4 tasks', async () => {
    a.uids = ['u1'];
    a.pendingTasksByUid['u1'] = Array.from({ length: 6 }, (_, i) => ({
      id: `t${i}`, subjectId: 's1', scheduledFor: 1_700_000_000_000 + i * 1000,
    }));
    await cronTick('DAILY_PLAN', a);
    expect(a.dailyPlans).toHaveLength(1);
    expect(a.dailyPlans[0]?.blocks).toHaveLength(4);
    expect(a.dailyPlans[0]?.blocks[0]?.id).toBe('t0');
  });

  it('returns ok=false for unknown schedules', async () => {
    const out = await cronTick('WHATEVER', a);
    expect(out.ok).toBe(false);
  });
});