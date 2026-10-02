import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the mock fns are available inside the vi.mock
// factory (which Vitest hoists to the top of the file).
const { mockJwksGet, mockVerifyJwt } = vi.hoisted(() => ({
  mockJwksGet: vi.fn(),
  mockVerifyJwt: vi.fn(),
}));

// Mirror the production Supabase shape: iss <url>/auth/v1, aud authenticated.
const SUPABASE_URL = 'https://test.supabase.co';
const ISS = `${SUPABASE_URL}/auth/v1`;

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({ get: mockJwksGet })),
  jwtVerify: (...args: unknown[]) => mockVerifyJwt(...args),
  errors: {
    JWSSignatureVerificationFailed: class extends Error {},
    JWTExpired: class extends Error {},
    JWTClaimValidationFailed: class extends Error {},
  },
}));

// Subject under test
import { verifySupabaseToken, requireAuth, requireAdmin, type AuthVariables } from '../src/auth';
import { Hono } from 'hono';

describe('verifySupabaseToken', () => {
  beforeEach(() => {
    mockJwksGet.mockReset();
    mockVerifyJwt.mockReset();
  });

  it('returns the decoded claims when the JWT is valid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'ES256' },
      payload: { sub: 'uid-1', role: 'authenticated', aud: 'authenticated', iss: ISS },
    });
    const out = await verifySupabaseToken('a.b.c', SUPABASE_URL);
    expect(out.sub).toBe('uid-1');
    expect(out.role).toBe('authenticated');
  });

  it('rejects when the token signature is invalid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockRejectedValue(new Error('invalid signature'));
    await expect(verifySupabaseToken('a.b.c', SUPABASE_URL)).rejects.toThrow(/signature/i);
  });

  it('rejects when the audience does not match', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    // jose throws JWTClaimValidationFailed when aud mismatches; the wrapper
    // simply throws — verifySupabaseToken re-throws with a clear msg.
    mockVerifyJwt.mockRejectedValue(new Error('aud mismatch'));
    await expect(verifySupabaseToken('a.b.c', SUPABASE_URL)).rejects.toThrow();
  });
});

describe('requireAuth (Hono middleware)', () => {
  beforeEach(() => {
    mockJwksGet.mockReset();
    mockVerifyJwt.mockReset();
  });

  it('passes through and sets c.set("uid", ...) when Authorization is valid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'ES256' },
      payload: { sub: 'uid-2', aud: 'authenticated', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ uid: 'uid-2' });
  });

  it('returns 401 when no Authorization header', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockRejectedValue(new Error('bad sig'));
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(401);
  });

  it('exposes the admin flag from app_metadata when set', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'ES256' },
      payload: { sub: 'admin-uid', app_metadata: { admin: true }, aud: 'authenticated', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.get('/who', (c) => {
      const claims = c.get('claims');
      return c.json({ uid: c.get('uid'), admin: claims?.app_metadata?.admin === true });
    });
    const res = await app.request('/who', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(await res.json()).toEqual({ uid: 'admin-uid', admin: true });
  });
});

describe('requireAdmin (Hono middleware)', () => {
  beforeEach(() => {
    mockJwksGet.mockReset();
    mockVerifyJwt.mockReset();
  });

  it('returns 403 when admin flag is missing', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'ES256' },
      payload: { sub: 'u1', aud: 'authenticated', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.use('*', requireAdmin());
    app.get('/secret', (c) => c.json({ ok: true }));
    const res = await app.request('/secret', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(403);
  });

  it('passes through when admin flag is set', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'ES256' },
      payload: { sub: 'admin', app_metadata: { admin: true }, aud: 'authenticated', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth(SUPABASE_URL));
    app.use('*', requireAdmin());
    app.get('/secret', (c) => c.json({ ok: true }));
    const res = await app.request('/secret', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(200);
  });
});
