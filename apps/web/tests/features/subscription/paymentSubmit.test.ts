import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadBytesMock = vi.fn().mockResolvedValue(undefined);
const refMock = vi.fn();
const addDocMock = vi.fn().mockResolvedValue({ id: 'req-123' });
const collectionMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __serverTimestamp: true }));
const httpsCallableMock = vi.fn();

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({ _storage: true })),
  ref: (...args: unknown[]) => refMock(...args),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...args),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  collection: (...args: unknown[]) => collectionMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ _fn: true })),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

import { submitPaymentRequest } from '@/features/subscription/paymentSubmit';

describe('submitPaymentRequest', () => {
  beforeEach(() => {
    uploadBytesMock.mockClear();
    addDocMock.mockClear();
    httpsCallableMock.mockClear();
    collectionMock.mockClear();
    refMock.mockClear();

    // Each test gets a fresh httpsCallable that returns a one-off vi.fn()
    httpsCallableMock.mockImplementation(() =>
      vi.fn(async (data: { contentType: string }) => ({
        data: {
          url: `https://signed/${data.contentType}`,
          path: `paymentRequests/u1/abc.png`,
          expires: Date.now() + 5 * 60 * 1000,
        },
      })),
    );
  });

  it('mints a signed URL, uploads the file, and creates a paymentRequest doc', async () => {
    const file = new File(['x'], 'screenshot.png', { type: 'image/png' });
    const id = await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1', file });
    expect(id).toBe('req-123');
    expect(uploadBytesMock).toHaveBeenCalledTimes(1);
    expect(addDocMock).toHaveBeenCalledTimes(1);
  });

  it('writes the doc with the storage path, planId, trxId, status=pending', async () => {
    const file = new File(['x'], 'screenshot.png', { type: 'image/png' });
    await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1', file });
    const calls = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(calls).toBeDefined();
    const docArg = calls![1];
    expect(docArg.uid).toBe('u1');
    expect(docArg.planId).toBe('3m');
    expect(docArg.trxId).toBe('TXN1');
    expect(docArg.status).toBe('pending');
    expect(docArg.storagePath).toMatch(/^paymentRequests\/u1\//);
  });

  it('passes the file contentType to the signed-url function', async () => {
    const file = new File(['x'], 'shot.jpg', { type: 'image/jpeg' });
    await submitPaymentRequest({ uid: 'u1', planId: '1m', trxId: 'TXN2', file });
    const callableResult = httpsCallableMock.mock.results[0];
    expect(callableResult).toBeDefined();
    const fn = (callableResult as { value: ReturnType<typeof vi.fn> }).value;
    expect(fn).toHaveBeenCalledWith({ contentType: 'image/jpeg' });
  });
});