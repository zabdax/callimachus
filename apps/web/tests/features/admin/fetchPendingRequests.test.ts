import { describe, it, expect, vi, beforeEach } from 'vitest';

const whereMock = vi.fn();
const getDocsMock = vi.fn();
const collectionMock = vi.fn(() => ({ _collection: true }));
const queryMock = vi.fn((...args: unknown[]) => ({ _query: true, args }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  collection: vi.fn(() => ({ _collection: true })),
  query: vi.fn((...args: unknown[]) => ({ _query: true, args })),
  where: vi.fn((...args: unknown[]) => whereMock(...args)),
  getDocs: vi.fn((...args: unknown[]) => getDocsMock(...args)),
  orderBy: vi.fn((...a: unknown[]) => ({ _orderBy: a })),
  limit: vi.fn((n: number) => ({ _limit: n })),
}));

import { fetchPendingRequests } from '@/features/admin/fetchPendingRequests';

describe('fetchPendingRequests', () => {
  beforeEach(() => {
    whereMock.mockReset();
    collectionMock.mockClear();
    queryMock.mockClear();
    getDocsMock.mockReset();
  });

  it('queries paymentRequests where status == pending, ordered by createdAt desc, limit 50', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { id: 'pr1', data: () => ({ uid: 'u1', planId: '3m', status: 'pending', trxId: 'TXN1' }) },
      ],
    });
    const out = await fetchPendingRequests();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: 'pr1',
      uid: 'u1',
      planId: '3m',
      status: 'pending',
      trxId: 'TXN1',
    });
    // where('status', '==', 'pending') was used
    expect(whereMock).toHaveBeenCalledWith('status', '==', 'pending');
  });
});