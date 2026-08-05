import { describe, it, expect, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: { getIdToken: async () => 'token' },
  }),
}));

vi.mock('@/lib/firebase/client', () => ({ app: { _app: true } }));

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