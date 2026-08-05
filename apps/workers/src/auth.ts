import { createRemoteJWKSet, jwtVerify, errors as joseErrors, type JWTPayload } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

const FIREBASE_JWKS_URL = new URL('https://www.googleapis.com/robot/v1/metadata/jwks');
const JWKS = createRemoteJWKSet(FIREBASE_JWKS_URL);

export type AuthVariables = { uid: string; claims: FirebaseClaims };
export type FirebaseClaims = JWTPayload & { sub: string; admin?: boolean; user_id?: string };

export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseClaims> {
  if (!projectId) throw new Error('project id missing');
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) throw new Error('subject missing');
    if (typeof payload.user_id === 'string' && payload.user_id !== payload.sub) throw new Error('subject mismatch');
    return payload as FirebaseClaims;
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) throw new Error('id_token expired');
    if (e instanceof joseErrors.JWSSignatureVerificationFailed) throw new Error('id_token signature invalid');
    if (e instanceof joseErrors.JWTClaimValidationFailed) throw new Error(`id_token claim invalid: ${e.message}`);
    throw new Error(`id_token verification failed: ${(e as Error).message ?? 'unknown error'}`);
  }
}

export function requireAuth(projectId: string): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next) => {
    const match = /^Bearer\s+([^\s]+)$/i.exec(c.req.header('authorization') ?? '');
    if (!match) return c.json({ ok: false, error: 'unauthenticated' }, 401);
    try {
      const claims = await verifyFirebaseIdToken(match[1] ?? '', projectId);
      c.set('uid', claims.sub);
      c.set('claims', claims);
      await next();
    } catch {
      return c.json({ ok: false, error: 'unauthenticated' }, 401);
    }
  };
}

export function requireAdmin(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    if (!c.get('claims')?.admin) return c.json({ ok: false, error: 'forbidden' }, 403);
    await next();
  };
}
