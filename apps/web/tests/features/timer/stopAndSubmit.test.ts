import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueSession, listPending, dropPending } from '@/features/timer/offlineQueue';
import { stopAndSubmit, replayPending } from '@/features/timer/stopAndSubmit';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } }, error: null }),
    },
  },
  getAccessToken: async () => 'token',
}));

describe('stopAndSubmit', () => {
  beforeEach(async () => { await dropPending(); fetchMock.mockReset(); });

  it('queues a session when the network call fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const r = await stopAndSubmit({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    expect(r).toMatchObject({ ok: true, queued: true });
    expect((await listPending()).length).toBe(1);
  });

  it('replayPending drains the queue when the network succeeds', async () => {
    await enqueueSession({ id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true, sessionIds: ['s1'] } }),
    });
    await replayPending('u1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await listPending()).length).toBe(0);
  });
});