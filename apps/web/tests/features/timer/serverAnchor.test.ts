import { describe, it, expect, vi } from 'vitest';

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

import { callSessionStart } from '@/features/timer/serverAnchor';

describe('serverAnchor', () => {
  it('returns serverStartTs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { serverStartTs: 1001 } }),
    });
    const r = await callSessionStart(1000);
    expect(r.serverStartTs).toBe(1001);
  });
});