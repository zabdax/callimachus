import { Hono } from 'hono';
import type { Env } from './env.js';
import { requireAuth, requireAdmin, type AuthVariables } from './auth.js';
import { processStudySession } from './handlers/processStudySession.js';
import { sessionStart } from './handlers/sessionStart.js';
import { approvePayment } from './handlers/approvePayment.js';
import { requireUid, WorkerError } from './db.js';
import { makeDbAdapter, makeAuditLogger } from './supabase.js';

/**
 * Origin allowlist built from ALLOWED_ORIGINS. Plain entries match
 * exactly; entries starting with `*.` or `*-` match any host ending with
 * the rest (so `*-team.vercel.app` covers every preview deployment of a
 * Vercel project, which each get a unique subdomain).
 */
function buildOriginMatcher(raw: string): (origin: string) => boolean {
  const rules = (raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) =>
      entry.startsWith('*.') || entry.startsWith('*-')
        ? { suffix: entry.slice(1) }
        : { exact: entry },
    );
  return (origin) =>
    rules.some((rule) =>
      'exact' in rule
        ? rule.exact === origin
        : origin.endsWith(rule.suffix) && origin.length > rule.suffix.length,
    );
}

export function createApp(env: Env): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  const db = makeDbAdapter({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY });
  const audit = makeAuditLogger({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY });
  const originAllowed = buildOriginMatcher(env.ALLOWED_ORIGINS || env.WORKERS_BASE);

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    if (c.req.method === 'OPTIONS') {
      if (!origin || !originAllowed(origin)) return c.text('Forbidden', 403);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    await next();
    if (origin && originAllowed(origin)) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([key, value]) => c.res.headers.set(key, value));
    }
  });

  app.get('/api/echo', (c) => c.json({ ok: true, service: 'callimachus-workers', ts: Date.now() }));
  // Unauthenticated health check for diagnosing Supabase connectivity /
  // config issues without leaking the secret. Reports presence only.
  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      service: 'callimachus-workers',
      ts: Date.now(),
      config: {
        hasSupabaseUrl: Boolean(env.SUPABASE_URL),
        supabaseUrl: env.SUPABASE_URL ?? '',
        hasServiceKey: Boolean(env.SUPABASE_SERVICE_KEY),
      },
    });
  });
  app.get('/api/private/me', requireAuth(env.SUPABASE_URL), (c) => c.json({ ok: true, uid: c.get('uid'), admin: !!(c.get('claims')?.app_metadata?.admin) }));

  app.post('/api/sessionStart', requireAuth(env.SUPABASE_URL), async (c) => {
    try {
      const body = await readBody<{ clientStartTs?: unknown }>(c);
      if (!Number.isSafeInteger(body.clientStartTs)) throw new WorkerError('invalid-argument', 'clientStartTs must be an integer timestamp');
      return c.json({ data: await sessionStart(requireUid(c.get('claims')), { clientStartTs: body.clientStartTs as number }, db) });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/processStudySession', requireAuth(env.SUPABASE_URL), async (c) => {
    try {
      const body = await readBody<Record<string, unknown>>(c);
      const uid = requireUid(c.get('claims'));
      return c.json({ data: await processStudySession(uid, body as never, db, c.req.header('user-agent') ?? 'unknown') });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/getUserData', requireAuth(env.SUPABASE_URL), async (c) => {
    try { return c.json({ data: { ...(await db.exportUserData(requireUid(c.get('claims')))), exportedAt: Date.now() } }); }
    catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/approvePayment', requireAuth(env.SUPABASE_URL), requireAdmin(), async (c) => {
    try {
      const body = await readBody<{ paymentRequestId?: unknown }>(c);
      if (typeof body.paymentRequestId !== 'string') throw new WorkerError('invalid-argument', 'paymentRequestId required');
      const adminUid = requireUid(c.get('claims'));
      return c.json({ data: await approvePayment(adminUid, { paymentRequestId: body.paymentRequestId }, db, { isAdmin: (uid) => db.adminExists(uid) }, audit) });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.notFound((c) => c.json({ ok: false, error: 'not_found', path: new URL(c.req.url).pathname }, 404));
  return app;
}

function corsHeaders(origin: string): Record<string, string> { return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }; }
async function readBody<T>(c: { req: { json: () => Promise<unknown> } }): Promise<T> { const body = await c.req.json().catch(() => null); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WorkerError('invalid-argument', 'invalid JSON body'); const value = (body as { data?: unknown }).data ?? body; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkerError('invalid-argument', 'invalid request data'); return value as T; }
function workerErrorResponse(c: { json: (body: unknown, status?: number) => Response }, error: unknown): Response { if (error instanceof WorkerError) { const out = error.toResponse(); return c.json(out.body, out.status); } console.error('worker request failed', error); return c.json({ ok: false, error: 'internal', message: 'Request could not be completed' }, 500); }

export const app = createApp({ ENVIRONMENT: 'development', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_KEY: 'eyJ0ZXN0LWtleQ', WORKERS_BASE: '', ALLOWED_ORIGINS: '', TRACKER_CACHE: undefined as unknown as KVNamespace });
