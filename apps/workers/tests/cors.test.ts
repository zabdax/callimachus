import { describe, it, expect } from 'vitest';
import { createApp } from '../src/router.js';
import type { Env } from '../src/env.js';

const env: Env = {
  ENVIRONMENT: 'development',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'eyJ0ZXN0LWtleQ',
  WORKERS_BASE: '',
  ALLOWED_ORIGINS: 'https://exact.example.com,*-team.vercel.app,*.dots.example.com',
  TRACKER_CACHE: undefined as unknown as KVNamespace,
};

const app = createApp(env);

describe('CORS origin matching (ALLOWED_ORIGINS)', () => {
  it('preflights an exact origin and echoes it', async () => {
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://exact.example.com', 'access-control-request-method': 'POST' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://exact.example.com');
  });

  it('preflights a *- suffix origin (Vercel preview subdomains)', async () => {
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://feat-landing-team.vercel.app' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://feat-landing-team.vercel.app');
  });

  it('preflights a *. suffix origin (dot subdomains)', async () => {
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://api.dots.example.com' },
    });
    expect(res.status).toBe(204);
  });

  it('rejects unknown origins on preflight with 403', async () => {
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example.net' },
    });
    expect(res.status).toBe(403);
  });

  it('does not match a suffix without its separator character', async () => {
    // `xteam.vercel.app` must NOT satisfy the `*-team.vercel.app` rule.
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://xteam.vercel.app' },
    });
    expect(res.status).toBe(403);
  });

  it('does not match a host that is only the bare suffix', async () => {
    // The literal host `-team.vercel.app` / `team.vercel.app` itself is not a match.
    const res = await app.request('/api/echo', {
      method: 'OPTIONS',
      headers: { origin: 'https://team.vercel.app' },
    });
    expect(res.status).toBe(403);
  });

  it('adds CORS headers on allowed GETs but not on denied ones', async () => {
    const allowed = await app.request('/api/echo', { headers: { origin: 'https://exact.example.com' } });
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://exact.example.com');
    const denied = await app.request('/api/echo', { headers: { origin: 'https://evil.example.net' } });
    expect(denied.status).toBe(200);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
