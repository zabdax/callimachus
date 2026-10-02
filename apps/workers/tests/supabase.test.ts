import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDbAdapter, makeCronAdapters, makeAuditLogger } from '../src/supabase';

const CREDS = { url: 'https://test.supabase.co', serviceKey: 'eyJ0ZXN0LWtleQ' };

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
let queue: Array<{ status: number; body: unknown }> = [];

function mockFetch() {
  (globalThis as unknown as { fetch: unknown }).fetch = vi.fn(
    async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      const next = queue.shift() ?? { status: 200, body: [] };
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        text: async () => JSON.stringify(next.body),
      };
    },
  );
}

function serviceHeaders(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>;
}

describe('makeDbAdapter (PostgREST mapping)', () => {
  beforeEach(() => {
    calls = [];
    queue = [];
    mockFetch();
  });

  it('getLastSessionEndedAt orders by ended_at_ms desc and returns the value', async () => {
    queue = [{ status: 200, body: [{ ended_at_ms: 123 }] }];
    const db = makeDbAdapter(CREDS);
    expect(await db.getLastSessionEndedAt('u1')).toBe(123);
    expect(calls[0]?.url).toContain('/rest/v1/study_sessions');
    expect(calls[0]?.url).toContain('order=ended_at_ms.desc.nullslast');
    expect(serviceHeaders(calls[0]?.init ?? {})).toMatchObject({
      apikey: CREDS.serviceKey,
      Authorization: `Bearer ${CREDS.serviceKey}`,
    });
  });

  it('getLastSessionEndedAt returns null when no sessions exist', async () => {
    queue = [{ status: 200, body: [] }];
    expect(await makeDbAdapter(CREDS).getLastSessionEndedAt('u1')).toBeNull();
  });

  it('writeSession upserts with merge-duplicates', async () => {
    queue = [{ status: 200, body: [] }];
    await makeDbAdapter(CREDS).writeSession('u1', 's1', {
      startedAtMs: 10,
      endedAtMs: 70,
      durationSec: 60,
      date: '2026-10-02',
      presenceChecks: 1,
      device: { ua: 't', platform: 'web' },
      createdAt: null,
      chapterId: 'c1',
    });
    expect(calls[0]?.url).toContain('/rest/v1/study_sessions?on_conflict=id');
    expect(serviceHeaders(calls[0]?.init ?? {}).Prefer).toBe('resolution=merge-duplicates');
  });

  it('clearActiveSession is a conditional delete when updateTime is given', async () => {
    queue = [{ status: 204, body: null }];
    await makeDbAdapter(CREDS).clearActiveSession('u1', 's1', '2026-10-02T00:00:00Z');
    expect(calls[0]?.init?.method).toBe('DELETE');
    expect(calls[0]?.url).toContain('uid=eq.u1');
    expect(calls[0]?.url).toContain('session_id=eq.s1');
    expect(calls[0]?.url).toContain('updated_at=eq.');
  });

  it('getPaymentRequest maps snake_case columns', async () => {
    queue = [
      {
        status: 200,
        body: [{ uid: 'u1', plan_id: '1m', status: 'pending', updated_at: 't' }],
      },
    ];
    expect(await makeDbAdapter(CREDS).getPaymentRequest('p1')).toEqual({
      uid: 'u1',
      planId: '1m',
      status: 'pending',
      updateTime: 't',
    });
  });

  it('adminExists checks the admins table', async () => {
    queue = [{ status: 200, body: [{ uid: 'a1' }] }];
    expect(await makeDbAdapter(CREDS).adminExists('a1')).toBe(true);
    expect(calls[0]?.url).toContain('/rest/v1/admins');
    queue = [{ status: 200, body: [] }];
    expect(await makeDbAdapter(CREDS).adminExists('nobody')).toBe(false);
  });

  it('exportUserData fans out to five tables and unwraps settings', async () => {
    queue = [
      { status: 200, body: [{ id: 'u1', college: 'C' }] },
      { status: 200, body: [{ id: 's1' }] },
      { status: 200, body: [{ id: 'ss1' }] },
      { status: 200, body: [] },
      { status: 200, body: [{ data: { theme: 'dark' } }] },
    ];
    const out = await makeDbAdapter(CREDS).exportUserData('u1');
    expect(calls).toHaveLength(5);
    expect(out.profile).toEqual({ id: 'u1', college: 'C' });
    expect(out.settings).toEqual({ theme: 'dark' });
  });

  it('throws a service-key hint on 401/403', async () => {
    queue = [{ status: 401, body: { message: 'key' } }];
    await expect(makeDbAdapter(CREDS).getLastSessionEndedAt('u1')).rejects.toThrow(
      /SUPABASE_SERVICE_KEY/,
    );
  });
});

describe('makeCronAdapters + makeAuditLogger', () => {
  beforeEach(() => {
    calls = [];
    queue = [];
    mockFetch();
  });

  it('listBatches converts timestamptz columns to epoch ms', async () => {
    queue = [
      {
        status: 200,
        body: [{ id: 'b1', college_start: '2026-01-01T00:00:00Z', exam_start: null, exam_end: null }],
      },
    ];
    const [b] = await makeCronAdapters(CREDS).listBatches();
    expect(b?.id).toBe('b1');
    expect(b?.collegeStart).toBe(new Date('2026-01-01T00:00:00Z').getTime());
  });

  it('audit log posts to audit_log', async () => {
    queue = [{ status: 201, body: {} }];
    await makeAuditLogger(CREDS).log({ actor: 'a', action: 'x', target: 't', after: {} });
    expect(calls[0]?.url).toContain('/rest/v1/audit_log');
  });
});
