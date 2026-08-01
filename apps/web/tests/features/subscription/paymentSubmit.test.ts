import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
const addDocMock = vi.fn().mockResolvedValue({ id: 'req-123' });
const collectionMock = vi.fn();
const serverTimestampMock = vi.fn(() => ({ __serverTimestamp: true }));

vi.stubGlobal('fetch', fetchMock);

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { getIdToken: async () => 't' } }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  collection: (...args: unknown[]) => collectionMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}));

vi.mock('@/lib/firebase/client', () => ({ app: { _app: true } }));

import { submitPaymentRequest } from '@/features/subscription/paymentSubmit';

describe('submitPaymentRequest', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    addDocMock.mockClear();
    collectionMock.mockClear();

    // 1st call: generateSignedUploadUrl
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          url: 'https://signed/paymentRequests/u1/abc.png',
          path: 'paymentRequests/u1/abc.png',
          expires: Date.now() + 5 * 60 * 1000,
        },
      }),
    });
    // 2nd call: PUT the file to signed URL
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
  });

  it('mints a signed URL, uploads the file, and creates a paymentRequest doc', async () => {
    const file = new File(['x'], 'screenshot.png', { type: 'image/png' });
    const id = await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1', file });
    expect(id).toBe('req-123');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it('passes the file contentType to the signed-url call', async () => {
    const file = new File(['x'], 'shot.jpg', { type: 'image/jpeg' });
    await submitPaymentRequest({ uid: 'u1', planId: '1m', trxId: 'TXN2', file });
    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(firstCall[1].body as string);
    expect(body).toEqual({ data: { contentType: 'image/jpeg' } });
  });
});