import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionStart, assertDriftWithinTolerance } from '../src/handlers/sessionStart';
import { processStudySession } from '../src/handlers/processStudySession';
import { StubFirestore, WorkerError, type FirestoreAdapter } from '../src/db';

// Replace 'stub' with a thin subclass that records writes for assertions.
class RecordingDb extends StubFirestore {
  writes: { path: string; data: unknown }[] = [];
  count: Record<string, number> = {};
  lastEndedAt: number | null = null;
  activeSession = { sessionId: 's1', serverStartTs: 1_700_000_000_000, clientStartTs: 1_700_000_000_000 };

  override getLastSessionEndedAt(): Promise<number | null> {
    return Promise.resolve(this.lastEndedAt);
  }
  override countTodaySessions(_uid: string, date: string): Promise<number> {
    return Promise.resolve(this.count[date] ?? 0);
  }
  override writeSession(uid: string, id: string, doc: unknown): Promise<void> {
    this.writes.push({ path: `users/${uid}/sessions/${id}`, data: doc });
    return Promise.resolve();
  }
  override incrementDailyLeaderboard(date: string, dur: number, uid: string): Promise<void> {
    this.writes.push({
      path: `analytics/leaderboard_daily/${date}/users/${uid}`,
      data: { durationSec: dur },
    });
    return Promise.resolve();
  }
  override incrementChapterStat(uid: string, cid: string, dur: number): Promise<void> {
    this.writes.push({ path: `users/${uid}/chapterStats/${cid}`, data: { totalSec: dur } });
    return Promise.resolve();
  }
  override setActiveSession(uid: string, sessionOrServerTs: { sessionId: string; serverStartTs: number; clientStartTs: number } | number, clientTs?: number): Promise<void> {
    const data = typeof sessionOrServerTs === 'number'
      ? { sessionId: 'legacy', serverStartTs: sessionOrServerTs, clientStartTs: clientTs ?? 0 }
      : sessionOrServerTs;
    this.activeSession = data;
    this.writes.push({ path: `users/${uid}/activeSession/current`, data });
    return Promise.resolve();
  }
  override getActiveSession(): Promise<{ sessionId: string; serverStartTs: number; clientStartTs: number } | null> {
    return Promise.resolve(this.activeSession);
  }
  override clearActiveSession(): Promise<void> {
    return Promise.resolve();
  }
}

describe('sessionStart', () => {
  let db: RecordingDb;
  beforeEach(() => {
    db = new RecordingDb();
  });

  it('writes the activeSession doc and returns serverStartTs', async () => {
    const now = () => 1_700_000_000_000;
    const out = await sessionStart('u1', { clientStartTs: 1_700_000_000_000 - 5 }, db, now);
    expect(out.serverStartTs).toBe(1_700_000_000_000);
    expect(out.sessionId).toBeTypeOf('string');
    expect(db.writes).toHaveLength(1);
    expect(db.writes[0]?.path).toBe('users/u1/activeSession/current');
  });
});

describe('assertDriftWithinTolerance', () => {
  it('passes when drift is under 5 min', () => {
    expect(() => assertDriftWithinTolerance(1000, 1000 + 60_000)).not.toThrow();
  });
  it('throws when drift exceeds 5 min', () => {
    expect(() => assertDriftWithinTolerance(1000, 1000 + 6 * 60_000)).toThrow(WorkerError);
  });
});

describe('processStudySession', () => {
  let db: RecordingDb;
  beforeEach(() => {
    db = new RecordingDb();
  });

  const validInput = () => ({
    sessionId: 's1',
    clientStartTs: 1_700_000_000_000,
    clientEndedTs: 1_700_000_000_000 + 30 * 60_000, // 30 min
    serverStartTs: 1_700_000_000_000,
    chapterId: 'physics1/vectors',
    presenceNonces: [
      { id: 'n1', issuedAt: 1_700_000_100_000, echoedAt: 1_700_000_130_000 },
      { id: 'n2', issuedAt: 1_700_000_700_000, echoedAt: 1_700_000_730_000 },
      { id: 'n3', issuedAt: 1_700_001_300_000, echoedAt: 1_700_001_330_000 },
    ],
  });

  it('writes one session per BST segment + leaderboard increments', async () => {
    const out = await processStudySession('u1', validInput(), db, 'jest-ua');
    expect(out.ok).toBe(true);
    expect(out.sessionIds.length).toBe(1);
    // 1 session write + 1 leaderboard doc
    const writes = db.writes.map((w) => w.path);
    expect(writes.some((p) => p.startsWith('users/u1/sessions/'))).toBe(true);
    expect(writes.some((p) => p.startsWith('analytics/leaderboard_daily/'))).toBe(true);
    expect(writes.some((p) => p.startsWith('users/u1/chapterStats/'))).toBe(true);
  });

  it('rejects durations shorter than 10 seconds', async () => {
    const bad = { ...validInput(), clientEndedTs: validInput().clientStartTs + 5_000 };
    await expect(processStudySession('u1', bad, db, 'ua')).rejects.toThrow(WorkerError);
  });

  it('rejects durations longer than 6 hours', async () => {
    const bad = {
      ...validInput(),
      clientEndedTs: validInput().clientStartTs + 7 * 3600 * 1000,
    };
    await expect(processStudySession('u1', bad, db, 'ua')).rejects.toThrow(WorkerError);
  });

  it('rejects clock drift over 5 min', async () => {
    const bad = { ...validInput(), serverStartTs: validInput().clientStartTs + 10 * 60_000 };
    await expect(processStudySession('u1', bad, db, 'ua')).rejects.toThrow(WorkerError);
  });

  it('rejects overlap with the previous session', async () => {
    db.lastEndedAt = validInput().clientStartTs + 60_000;
    await expect(processStudySession('u1', validInput(), db, 'ua')).rejects.toThrow(
      /overlap/,
    );
  });

  it('rejects when daily cap is hit', async () => {
    // 1700000000000 UTC ≈ 2023-11-14 18:13 UTC → Asia/Dhaka 2023-11-15 00:13
    db.count['2023-11-15'] = 10;
    await expect(processStudySession('u1', validInput(), db, 'ua')).rejects.toThrow(
      /daily cap/,
    );
  });

  it('rejects when the server-owned active session does not match', async () => {
    db.activeSession = { sessionId: 'different-session', serverStartTs: 1_700_000_000_000, clientStartTs: 1_700_000_000_000 };
    await expect(processStudySession('u1', validInput(), db, 'ua')).rejects.toThrow(
      /active study session/,
    );
  });
});