import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const put = vi.fn().mockResolvedValue(undefined);
  const get = vi.fn().mockResolvedValue({ empty: true, docs: [] });
  const countGet = vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) });
  const count = vi.fn(() => ({ get: countGet }));
  const orderBy = vi.fn(() => ({ limit: () => ({ get }) }));
  const where = vi.fn(() => ({ count }));
  const collection = vi.fn(() => ({ orderBy, where, get }));
  const doc = vi.fn(() => ({ set: put }));
  const increment = (n: number) => ({ __increment: n });
  const serverTimestamp = () => ({ __ts: 1 });
  const timestampNow = () => ({ __ts: 1 });
  const fromDate = (d: Date) => ({ __ts: d.getTime() });
  // The real `admin.firestore` is both callable (returns the default instance)
  // AND a namespace object exposing FieldValue / Timestamp as static members.
  // We replicate that here so production code can use `admin.firestore.FieldValue`.
  const firestoreFn: any = vi.fn(() => ({
    collection,
    doc,
    FieldValue: { increment, serverTimestamp },
    Timestamp: { now: timestampNow, fromDate },
  }));
  firestoreFn.FieldValue = { increment, serverTimestamp };
  firestoreFn.Timestamp = { now: timestampNow, fromDate };
  return { firestoreFn, put, get, countGet, count, orderBy, where, collection, doc, increment, serverTimestamp, timestampNow, fromDate };
});

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: mocks.firestoreFn,
  Timestamp: { now: mocks.timestampNow, fromDate: mocks.fromDate },
}));

import { processStudySession } from '../src/processStudySession';

describe('processStudySession', () => {
  it('writes session + leaderboard when valid', async () => {
    const start = Date.now() - 60 * 60_000;
    const end = Date.now();
    const r = await (processStudySession as any).run(
      {
        clientStartTs: start,
        clientEndedTs: end,
        serverStartTs: start,
        chapterId: null,
        presenceNonces: [
          { id: 'n1', issuedAt: 0, echoedAt: 1000 },
          { id: 'n2', issuedAt: 0, echoedAt: 2000 },
          { id: 'n3', issuedAt: 0, echoedAt: 3000 },
        ],
      },
      { auth: { uid: 'u1' }, rawRequest: { headers: { 'user-agent': 'jest' } } },
    );
    expect(r.ok).toBe(true);
    expect(r.sessionIds.length).toBeGreaterThanOrEqual(1);
  });
});
