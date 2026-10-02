import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => ({
        select: () => ({ single: () => insertMock(row) }),
      }),
    }),
  },
}));

import { submitPaymentRequest } from '@/features/subscription/paymentSubmit';

describe('submitPaymentRequest (no-screenshot Plan 4 flow)', () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ data: { id: 'req-123' }, error: null });
  });

  it('inserts a pending row and returns the id', async () => {
    const id = await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1' });
    expect(id).toBe('req-123');
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('writes snake_case fields with status=pending', async () => {
    await submitPaymentRequest({ uid: 'u1', planId: '3m', trxId: 'TXN1' });
    const row = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.uid).toBe('u1');
    expect(row.plan_id).toBe('3m');
    expect(row.trx_id).toBe('TXN1');
    expect(row.status).toBe('pending');
  });
});
