import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

describe('worker entrypoint', () => {
  it('exports a default object with a fetch handler', () => {
    expect(worker).toBeTypeOf('object');
    expect(typeof worker.fetch).toBe('function');
  });

  it('dispatches GET /api/echo through the router', async () => {
    const req = new Request('http://localhost/api/echo');
    const res = await worker.fetch(req, { ENVIRONMENT: 'development', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'eyJ0ZXN0LWtleQ', WORKERS_BASE: '', ALLOWED_ORIGINS: '', TRACKER_CACHE: undefined as unknown as KVNamespace }, {} as ExecutionContext);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
