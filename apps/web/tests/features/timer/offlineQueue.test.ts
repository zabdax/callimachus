import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { enqueueSession, listPending, dropPending, type QueuedSession } from '@/features/timer/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(async () => { await dropPending(); });

  it('enqueue → listPending → dropPending round-trip', async () => {
    const s: QueuedSession = { id: 's1', uid: 'u1', clientStartTs: 1, clientEndedTs: 2, serverStartTs: 3, chapterId: null };
    await enqueueSession(s);
    const list = await listPending();
    expect(list).toEqual([s]);
    await dropPending();
    expect(await listPending()).toEqual([]);
  });
});
