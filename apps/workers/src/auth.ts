import {
  createRemoteJWKSet,
  jwtVerify,
  errors as joseErrors,
  type JWTPayload,
} from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

/**
 * Firebase exposes the JWKS for ID tokens at this URL. We cache it
 * module-scoped — Workers isolates live for many requests, so the
 * 10-min cache TTL inside `jose` is effectively per-isolate lifetime.
 */
const FIREBASE_JWKS_URL = new URL(
  'https://www.googleapis.com/robot/v1/metadata/jwks',
);

const JWKS = createRemoteJWKSet(FIREBASE_JWKS_URL);

/** Variables stored on the Hono context after `requireAuth` succeeds. */
export type AuthVariables = {
  uid: string;
  claims: FirebaseClaims;
};

export type FirebaseClaims = JWTPayload & {
  /** Firebase sets `sub` to the Firebase Auth uid. */
  sub: string;
  /** Custom claim we set via `auth.setCustomUserClaims`. */
  admin?: boolean;
  /** Firebase sets `user_id` as an alias for `sub` in older tokens. */
  user_id?: string;
};

/**
 * Verify a Firebase ID token's signature + standard claims (aud, iss, exp).
 *
 * @param token - The raw JWT from `Authorization: Bearer <token>`.
 * @param projectId - The Firebase project id; used as the expected `aud`.
 *
 * Throws an Error whose message names the failure mode. Callers (Hono
 * middleware) translate to 401.
 */
export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
): Promise<FirebaseClaims> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: projectId,
      issuer: ['https://securetoken.google.com/', `https://securetoken.${projectId}.google.com/`],
      algorithms: ['RS256'],
    });
    return payload as FirebaseClaims;
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) {
      throw new Error('id_token expired');
    }
    if (e instanceof joseErrors.JWSSignatureVerificationFailed) {
      throw new Error('id_token signature invalid');
    }
    if (e instanceof joseErrors.JWTClaimValidationFailed) {
      throw new Error(`id_token claim invalid: ${e.message}`);
    }
    const msg = (e as Error).message ?? 'unknown error';
    throw new Error(`id_token verification failed: ${msg}`);
  }
}

/**
 * Hono middleware factory: verifies the bearer token, then sets
 * `c.set('uid', claims.sub)` and `c.set('claims', claims)` for downstream
 * handlers. Returns 401 on any failure.
 *
 * Usage:
 *   app.use('/api/*', requireAuth(env.FIREBASE_PROJECT_ID));
 */
export function requireAuth(projectId: string): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next) => {
    const header = c.req.header('authorization') ?? '';
    const m = /^Bearer\s+(.+)$/i.exec(header);
    if (!m?.[1]) return c.json({ ok: false, error: 'unauthenticated' }, 401);

    try {
      const claims = await verifyFirebaseIdToken(m[1], projectId);
      c.set('uid', claims.sub);
      c.set('claims', claims);
      await next();
    } catch (e) {
      return c.json(
        { ok: false, error: 'unauthenticated', detail: (e as Error).message },
        401,
      );
    }
  };
}

/**
 * Convenience for handlers that require admin role. Returns 403 if
 * the token's `admin` custom claim is not set. Must be chained AFTER
 * `requireAuth`.
 */
export function requireAdmin(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next) => {
    const claims = c.get('claims');
    if (!claims?.admin) {
      return c.json({ ok: false, error: 'forbidden' }, 403);
    }
    await next();
  };
}