import { describe, it, expect, vi, beforeEach } from 'vitest';

const addDocMock = vi.fn().mockResolvedValue({ id: 'req-123' });
const collectionMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __serverTimestamp: true }));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  collection: (...args: unknown[]) => collectionMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('@/lib/firebase/client', () => ({ app: { _app: true } }));

import { submitPaymentRequest } from '@/features/subscription/paymentSubmit';

describe('submitPaymentRequest (no-screenshot Plan 4 flow)', () => {
  beforeEach(() => {
    addDocMock.mockClear();
    collectionMock.mockClear();
  });

  it('writes a paymentRequests doc with status=pending and returns the id', async () => {
    const id = await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1' });
    expect(id).toBe('req-123');
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('writes the doc with the correct fields (no storagePath)', async () => {
    await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1' });
    const calls = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(calls).toBeDefined();
    const docArg = calls![1];
    expect(docArg.uid).toBe('u1');
    expect(docArg.planId).toBe('3m');
    expect(docArg.trxId).toBe('TXN1');
    expect(docArg.status).toBe('pending');
    // No storagePath in the no-screenshot flow
    expect(docArg.storagePath).toBeUndefined();
  });
});