import { createRemoteJWKSet, jwtVerify, errors as joseErrors, type JWTPayload } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';

export type AuthVariables = { uid: string; claims: SupabaseClaims };
export type SupabaseClaims = JWTPayload & {
  sub: string;
  /** Supabase Auth sets role=authenticated on user access tokens. */
  role?: string;
  /** Admin flag lives in app_metadata (set via Auth Admin API / SQL). */
  app_metadata?: { admin?: boolean; [key: string]: unknown };
  user_metadata?: Record<string, unknown>;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(supabaseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const base = supabaseUrl.replace(/\/$/, '');
  let set = jwksCache.get(base);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
    jwksCache.set(base, set);
  }
  return set;
}

export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<SupabaseClaims> {
  if (!supabaseUrl) throw new Error('supabase url missing');
  try {
    const { payload } = await jwtVerify(token, jwksFor(supabaseUrl), {
      audience: 'authenticated',
      issuer: `${supabaseUrl.replace(/\/$/, '')}/auth/v1`,
      algorithms: ['RS256', 'ES256'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
      throw new Error('subject missing');
    }
    return payload as SupabaseClaims;
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) throw new Error('access_token expired');
    if (e instanceof joseErrors.JWSSignatureVerificationFailed) throw new Error('access_token signature invalid');
    if (e instanceof joseErrors.JWTClaimValidationFailed) throw new Error(`access_token claim invalid: ${e.message}`);
    throw new Error(`access_token verification failed: ${(e as Error).message ?? 'unknown error'}`);
  }
}

export function isAdminClaim(claims: SupabaseClaims | undefined): boolean {
  return claims?.app_metadata?.admin === true;
}

export function requireAuth(supabaseUrl: string): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c: Context<{ Variables: AuthVariables }>, next) => {
    const match = /^Bearer\s+([^\s]+)$/i.exec(c.req.header('authorization') ?? '');
    if (!match) return c.json({ ok: false, error: 'unauthenticated' }, 401);
    try {
      const claims = await verifySupabaseToken(match[1] ?? '', supabaseUrl);
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
    if (!isAdminClaim(c.get('claims'))) return c.json({ ok: false, error: 'forbidden' }, 403);
    await next();
  };
}
