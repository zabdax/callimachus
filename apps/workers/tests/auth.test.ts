import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the mock fns are available inside the vi.mock
// factory (which Vitest hoists to the top of the file).
const { mockJwksGet, mockVerifyJwt } = vi.hoisted(() => ({
  mockJwksGet: vi.fn(),
  mockVerifyJwt: vi.fn(),
}));

// Mirror the production Firebase issuer shape: https://securetoken.google.com/{projectId}.
// `jwtVerify` is mocked in this file, so this string is decorative — but keeping it
// faithful to auth.ts makes the test self-documenting.
const PROJECT_ID = 'hsc-tracker-ef2b5';
const ISS = `https://securetoken.google.com/${PROJECT_ID}`;

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
import { verifyFirebaseIdToken, requireAuth, requireAdmin, type AuthVariables } from '../src/auth';
import { Hono } from 'hono';

describe('verifyFirebaseIdToken', () => {
  beforeEach(() => {
    mockJwksGet.mockReset();
    mockVerifyJwt.mockReset();
  });

  it('returns the decoded claims when the JWT is valid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'RS256' },
      payload: { sub: 'uid-1', admin: true, aud: 'hsc-prod', iss: ISS },
    });
    const out = await verifyFirebaseIdToken('a.b.c', 'hsc-prod');
    expect(out.sub).toBe('uid-1');
    expect(out.admin).toBe(true);
  });

  it('rejects when the token signature is invalid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockRejectedValue(new Error('invalid signature'));
    await expect(verifyFirebaseIdToken('a.b.c', 'hsc-prod')).rejects.toThrow(/signature/i);
  });

  it('rejects when the audience does not match the project', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    // jose throws JWTClaimValidationFailed when aud mismatches; verifyJwt
    // simply throws — verifyFirebaseIdToken re-throws with a clear msg.
    mockVerifyJwt.mockRejectedValue(new Error('aud mismatch'));
    await expect(verifyFirebaseIdToken('a.b.c', 'hsc-prod')).rejects.toThrow();
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
      protectedHeader: { alg: 'RS256' },
      payload: { sub: 'uid-2', aud: 'p', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ uid: 'uid-2' });
  });

  it('returns 401 when no Authorization header', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockRejectedValue(new Error('bad sig'));
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.get('/who', (c) => c.json({ uid: c.get('uid') }));
    const res = await app.request('/who', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(401);
  });

  it('exposes the admin claim when set', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'RS256' },
      payload: { sub: 'admin-uid', admin: true, aud: 'p', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.get('/who', (c) => {
      const claims = c.get('claims');
      return c.json({ uid: c.get('uid'), admin: !!claims?.admin });
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

  it('returns 403 when admin claim is missing', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'RS256' },
      payload: { sub: 'u1', aud: 'p', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.use('*', requireAdmin());
    app.get('/secret', (c) => c.json({ ok: true }));
    const res = await app.request('/secret', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(403);
  });

  it('passes through when admin claim is set', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'RS256' },
      payload: { sub: 'admin', admin: true, aud: 'p', iss: ISS },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', requireAuth('p'));
    app.use('*', requireAdmin());
    app.get('/secret', (c) => c.json({ ok: true }));
    const res = await app.request('/secret', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(200);
  });
});