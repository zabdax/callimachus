import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueSession, listPending, dropPending } from '@/features/timer/offlineQueue';
import { stopAndSubmit, replayPending } from '@/features/timer/stopAndSubmit';

const callMock = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data: unknown) => callMock(data),
}));

describe('stopAndSubmit', () => {
  beforeEach(async () => { await dropPending(); callMock.mockReset(); });

  it('queues a session when the network call fails', async () => {
    callMock.mockRejectedValueOnce(new Error('offline'));
    const r = await stopAndSubmit({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    expect(r).toMatchObject({ ok: true, queued: true });
    expect((await listPending()).length).toBe(1);
  });

  it('replayPending drains the queue when the network succeeds', async () => {
    await enqueueSession({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    callMock.mockResolvedValueOnce({ data: { ok: true, sessionIds: ['s1'] } });
    await replayPending('u1');
    expect(callMock).toHaveBeenCalledTimes(1);
    expect((await listPending()).length).toBe(0);
  });
});
