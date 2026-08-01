import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const { mockJwksGet, mockVerifyJwt } = vi.hoisted(() => ({
  mockJwksGet: vi.fn(),
  mockVerifyJwt: vi.fn(),
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({ get: mockJwksGet })),
  jwtVerify: (...args: unknown[]) => mockVerifyJwt(...args),
  errors: {
    JWSSignatureVerificationFailed: class extends Error {},
    JWTExpired: class extends Error {},
    JWTClaimValidationFailed: class extends Error {},
  },
}));

// Import AFTER mocks are set up. We bypass the project's router
// because it uses process.env.FIREBASE_PROJECT_ID — easier to recreate
// the middleware chain here than to stub the env.
import { requireAuth, type AuthVariables } from '../src/auth';

describe('router wire-up: /api/private/me (using requireAuth directly)', () => {
  beforeEach(() => {
    mockJwksGet.mockReset();
    mockVerifyJwt.mockReset();
  });

  it('returns the decoded uid + admin claim when Authorization is valid', async () => {
    mockJwksGet.mockResolvedValue('public-key');
    mockVerifyJwt.mockResolvedValue({
      protectedHeader: { alg: 'RS256' },
      payload: {
        sub: 'uid-private',
        admin: false,
        aud: 'test-project',
        iss: 'https://securetoken.google.com/',
      },
    });
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('/api/private/*', requireAuth('test-project'));
    app.get('/api/private/me', (c) => {
      const uid = c.get('uid');
      const claims = c.get('claims');
      return c.json({ ok: true, uid, admin: !!claims?.admin });
    });
    const res = await app.request('/api/private/me', {
      headers: { Authorization: 'Bearer x.y.z' },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, uid: 'uid-private', admin: false });
  });

  it('returns 401 when no Authorization header', async () => {
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('/api/private/*', requireAuth('test-project'));
    app.get('/api/private/me', (c) => c.json({ ok: true }));
    const res = await app.request('/api/private/me');
    expect(res.status).toBe(401);
  });
});