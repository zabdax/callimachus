import { describe, it, expect, vi, beforeEach } from 'vitest';

const terminalMock = vi.fn();

function chain(result: unknown) {
  const q: Record<string, (...a: unknown[]) => unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.order = () => q;
  q.limit = () => terminalMock(result);
  return q;
}

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => chain(undefined) }),
  },
}));

import { fetchPendingRequests } from '@/features/admin/fetchPendingRequests';

describe('fetchPendingRequests', () => {
  beforeEach(() => {
    terminalMock.mockReset();
  });

  it('maps pending rows ordered by created_at desc, limit 50', async () => {
    terminalMock.mockResolvedValue({
      data: [
        {
          id: 'pr1',
          uid: 'u1',
          plan_id: '3m',
          status: 'pending',
          trx_id: 'TXN1',
          created_at: '2026-08-05T00:00:00Z',
        },
      ],
      error: null,
    });
    const out = await fetchPendingRequests();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: 'pr1',
      uid: 'u1',
      planId: '3m',
      status: 'pending',
      trxId: 'TXN1',
      createdAt: new Date('2026-08-05T00:00:00Z').getTime(),
    });
  });
});
