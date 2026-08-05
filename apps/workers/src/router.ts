import { Hono } from 'hono';
import type { Env } from './env.js';
import { requireAuth, requireAdmin, type AuthVariables } from './auth.js';
import { processStudySession } from './handlers/processStudySession.js';
import { sessionStart } from './handlers/sessionStart.js';
import { approvePayment } from './handlers/approvePayment.js';
import { requireUid, WorkerError } from './db.js';
import { makeRestAdapter } from './firebase-admin.js';

export function createApp(env: Env): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  const db = makeRestAdapter({ projectId: env.FIREBASE_PROJECT_ID, accessToken: env.FIREBASE_ACCESS_TOKEN });
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || env.WORKERS_BASE).split(',').map((origin) => origin.trim()).filter(Boolean));

  app.use('*', async (c, next) => {
    const origin = c.req.header('origin');
    if (c.req.method === 'OPTIONS') {
      if (!origin || !allowedOrigins.has(origin)) return c.text('Forbidden', 403);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    await next();
    if (origin && allowedOrigins.has(origin)) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([key, value]) => c.res.headers.set(key, value));
    }
  });

  app.get('/api/echo', (c) => c.json({ ok: true, service: 'callimachus-workers', ts: Date.now() }));
  app.get('/api/private/me', requireAuth(env.FIREBASE_PROJECT_ID), (c) => c.json({ ok: true, uid: c.get('uid'), admin: !!c.get('claims')?.admin }));

  app.post('/api/sessionStart', requireAuth(env.FIREBASE_PROJECT_ID), async (c) => {
    try {
      const body = await readBody<{ clientStartTs?: unknown }>(c);
      if (!Number.isSafeInteger(body.clientStartTs)) throw new WorkerError('invalid-argument', 'clientStartTs must be an integer timestamp');
      return c.json({ data: await sessionStart(requireUid(c.get('claims')), { clientStartTs: body.clientStartTs as number }, db) });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/processStudySession', requireAuth(env.FIREBASE_PROJECT_ID), async (c) => {
    try {
      const body = await readBody<Record<string, unknown>>(c);
      const uid = requireUid(c.get('claims'));
      return c.json({ data: await processStudySession(uid, body as never, db, c.req.header('user-agent') ?? 'unknown') });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/getUserData', requireAuth(env.FIREBASE_PROJECT_ID), async (c) => {
    try { return c.json({ data: { ...(await db.exportUserData(requireUid(c.get('claims')))), exportedAt: Date.now() } }); }
    catch (error) { return workerErrorResponse(c, error); }
  });

  app.post('/api/approvePayment', requireAuth(env.FIREBASE_PROJECT_ID), requireAdmin(), async (c) => {
    try {
      const body = await readBody<{ paymentRequestId?: unknown }>(c);
      if (typeof body.paymentRequestId !== 'string') throw new WorkerError('invalid-argument', 'paymentRequestId required');
      const adminUid = requireUid(c.get('claims'));
      return c.json({ data: await approvePayment(adminUid, { paymentRequestId: body.paymentRequestId }, db, { isAdmin: (uid) => db.adminExists(uid) }, { log: async () => undefined }) });
    } catch (error) { return workerErrorResponse(c, error); }
  });

  app.notFound((c) => c.json({ ok: false, error: 'not_found', path: new URL(c.req.url).pathname }, 404));
  return app;
}

function corsHeaders(origin: string): Record<string, string> { return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }; }
async function readBody<T>(c: { req: { json: () => Promise<unknown> } }): Promise<T> { const body = await c.req.json().catch(() => null); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new WorkerError('invalid-argument', 'invalid JSON body'); const value = (body as { data?: unknown }).data ?? body; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkerError('invalid-argument', 'invalid request data'); return value as T; }
function workerErrorResponse(c: { json: (body: unknown, status?: number) => Response }, error: unknown): Response { if (error instanceof WorkerError) { const out = error.toResponse(); return c.json(out.body, out.status); } console.error('worker request failed', error); return c.json({ ok: false, error: 'internal', message: 'Request could not be completed' }, 500); }

export const app = createApp({ ENVIRONMENT: 'development', FIREBASE_PROJECT_ID: 'test-project', FIREBASE_ACCESS_TOKEN: 'test-token', WORKERS_BASE: '', ALLOWED_ORIGINS: '', TRACKER_CACHE: undefined as unknown as KVNamespace });
