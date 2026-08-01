import { describe, it, expect, vi, beforeEach } from 'vitest';

const docGet = vi.fn();
const docSet = vi.fn().mockResolvedValue(undefined);
const docUpdate = vi.fn().mockResolvedValue(undefined);
const docAdd = vi.fn().mockResolvedValue({ id: 'audit-1' });
const collectionFn = vi.fn(() => ({ add: docAdd }));
const firestoreDocFn = vi.fn((...args: unknown[]) => {
  const path = (args[0] as string) ?? '';
  return {
    path,
    get: docGet,
    set: (...a: unknown[]) => docSet(path, ...a),
    update: (...a: unknown[]) => docUpdate(path, ...a),
  };
});

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({
    doc: firestoreDocFn,
    collection: collectionFn,
  }),
}));

import { approvePayment } from '../src/approvePayment';

describe('approvePayment', () => {
  beforeEach(() => {
    docGet.mockReset();
    docSet.mockClear();
    docUpdate.mockClear();
    docAdd.mockClear();
    firestoreDocFn.mockClear();
    collectionFn.mockClear();
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      approvePayment.run(
        { data: { paymentRequestId: 'pr1' } },
        { auth: undefined } as never,
      ),
    ).rejects.toThrow(/sign in/i);
  });

  it('rejects non-admin users', async () => {
    // /admins/{uid} doc does not exist
    docGet.mockResolvedValue({ exists: false });
    await expect(
      approvePayment.run(
        { data: { paymentRequestId: 'pr1' } },
        { auth: { uid: 'u1', token: {} } } as never,
      ),
    ).rejects.toThrow(/admin/i);
  });

  it('reads the paymentRequest, sets the user subscription, writes audit, marks pr approved', async () => {
    // First call: /admins/{uid} -> exists true
    // Second call: /paymentRequests/{id} -> snapshot with planId, uid
    let n = 0;
    docGet.mockImplementation(async () => {
      n++;
      if (n === 1) return { exists: true, data: () => ({}) };
      return {
        exists: true,
        data: () => ({ uid: 'u9', planId: '3m' }),
      };
    });
    docUpdate.mockResolvedValue(undefined);
    docSet.mockResolvedValue(undefined);
    docAdd.mockResolvedValue({ id: 'audit-1' });

    const out = await approvePayment.run(
      { data: { paymentRequestId: 'pr1' } },
      { auth: { uid: 'admin-uid', token: { admin: true } } } as never,
    );
    expect(out.ok).toBe(true);
    // user subscription was set
    expect(docSet).toHaveBeenCalled();
    // paymentRequest was updated (status: approved)
    expect(docUpdate).toHaveBeenCalled();
    // audit log was written
    expect(docAdd).toHaveBeenCalled();
    const auditDoc = (docAdd.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(auditDoc.action).toBe('approve_payment');
    expect(auditDoc.actor).toBe('admin-uid');
    expect(auditDoc.target).toBe('pr1');
  });

  it('computes expiresAt as now + planMonths * 30 days', async () => {
    let n = 0;
    docGet.mockImplementation(async () => {
      n++;
      if (n === 1) return { exists: true, data: () => ({}) };
      return { exists: true, data: () => ({ uid: 'u9', planId: '6m' }) };
    });
    const before = Date.now();
    await approvePayment.run(
      { data: { paymentRequestId: 'pr2' } },
      { auth: { uid: 'admin-uid', token: { admin: true } } } as never,
    );
    const setCalls = docSet.mock.calls as unknown as Array<[string, Record<string, unknown>, unknown?]>;
    const userSetCall = setCalls.find(
      (c) => typeof c[0] === 'string' && c[0].startsWith('users/u9'),
    );
    expect(userSetCall).toBeDefined();
    const sub = (userSetCall as [string, Record<string, unknown>])[1].subscription as { expiresAt: number; plan: string };
    expect(sub.plan).toBe('6m');
    // 6 months * 30 days
    const expectedMs = before + 6 * 30 * 86_400_000;
    expect(sub.expiresAt).toBeGreaterThanOrEqual(expectedMs - 1000);
    expect(sub.expiresAt).toBeLessThanOrEqual(expectedMs + 5000);
  });
});