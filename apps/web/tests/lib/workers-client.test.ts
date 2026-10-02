import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
const getAccessTokenMock = vi.fn().mockResolvedValue('id-token-xyz');

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  },
  getAccessToken: (...args: unknown[]) => getAccessTokenMock(...args),
}));

import { callWorker, callWorkerUnwrap, WorkerError } from '@/lib/workers/client';

describe('callWorker', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getAccessTokenMock.mockReset();
    getAccessTokenMock.mockResolvedValue('id-token-xyz');
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  it('POSTs to /api/<name> with the { data } envelope and bearer token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ok: true } }),
    });
    await callWorker('sessionStart', { clientStartTs: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/sessionStart$/);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer id-token-xyz');
    expect(JSON.parse(init.body as string)).toEqual({ data: { clientStartTs: 1 } });
  });

  it('returns { data } on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { serverStartTs: 42 } }),
    });
    const out = await callWorker<{ clientStartTs: number }, { serverStartTs: number }>(
      'sessionStart',
      { clientStartTs: 0 },
    );
    expect(out.data).toEqual({ serverStartTs: 42 });
  });

  it('retries once with a refreshed token on 401', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthenticated', message: 'expired' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { ok: true } }),
      });
    getAccessTokenMock
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');
    const out = await callWorker('foo', {});
    expect(out.data).toEqual({ ok: true });
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((secondInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer fresh-token',
    );
  });

  it('throws WorkerError on non-2xx', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthenticated', message: 'no token' }),
    });
    await expect(callWorker('foo', {})).rejects.toThrow(WorkerError);
  });

  it('callWorkerUnwrap returns the inner data', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { hello: 'world' } }),
    });
    expect(await callWorkerUnwrap('foo', {})).toEqual({ hello: 'world' });
  });
});
