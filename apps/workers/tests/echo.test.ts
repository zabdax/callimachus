import { describe, it, expect } from 'vitest';
import { app } from '../src/router.js';

describe('GET /api/echo', () => {
  it('returns ok=true and a service identifier', async () => {
    const res = await app.request('/api/echo');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string; ts: number };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('callimachus-workers');
    expect(typeof body.ts).toBe('number');
    expect(body.ts).toBeGreaterThan(0);
  });

  it('returns a JSON 404 with the not_found error code for unknown paths', async () => {
    const res = await app.request('/api/does-not-exist');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; error: string; path: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
    expect(body.path).toBe('/api/does-not-exist');
  });
});
