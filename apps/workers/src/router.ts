import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from './auth.js';
import { processStudySession } from './handlers/processStudySession.js';
import { sessionStart } from './handlers/sessionStart.js';
import { requireUid, WorkerError } from './db.js';

/**
 * Hono router for the Callimachus Worker. Plan 4 / session 1 ships only
 * the `/api/echo` smoke handler. Real endpoints (processStudySession,
 * approvePayment, generateSignedUploadUrl, etc.) land in sessions 2+
 * per `docs/superpowers/specs/2026-08-01-platform-migration-design.md`.
 *
 * Tests instantiate this router directly via Hono's `app.request()`
 * helper; the worker's `fetch` entrypoint wraps it for production.
 */
export const app = new Hono();

app.get('/api/echo', (c) =>
  c.json({
    ok: true,
    service: 'callimachus-workers',
    ts: Date.now(),
  }),
);

// Session 2: protected `/api/private/me` returns the decoded uid + admin
// claim after Firebase ID-token verification. Project id is read from
// the FIREBASE_PROJECT_ID environment variable in production (configured
// in wrangler.toml under [vars]); tests inject a placeholder.
declare const process: { env: Record<string, string | undefined> };
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'test-project';

app.get(
  '/api/private/me',
  requireAuth(PROJECT_ID),
  (c) => {
    const uid = c.get('uid');
    const claims = c.get('claims');
    return c.json({ ok: true, uid, admin: !!claims?.admin });
  },
);

// Session 3: ported callable endpoints. The Firestore adapter is
// injected via getDb() — production wires the Admin SDK client in
// src/firebase-admin.ts; tests inject a stub.
async function getDb() {
  const mod = await import('./firebase-admin.js');
  return mod.firestoreAdapter;
}

app.post('/api/sessionStart', requireAuth(PROJECT_ID), async (c) => {
  const claims = c.get('claims');
  const uid = requireUid(claims);
  try {
    const body = (await c.req.json().catch(() => ({}))) as { data?: { clientStartTs?: number } };
    const clientStartTs = body.data?.clientStartTs ?? Date.now();
    const out = await sessionStart(uid, { clientStartTs }, await getDb());
    return c.json({ data: out });
  } catch (e) {
    const w = e instanceof WorkerError ? e.toResponse() : { status: 500, body: { ok: false, error: 'internal', message: (e as Error).message } };
    return c.json(w.body, w.status as 500);
  }
});

app.post('/api/processStudySession', requireAuth(PROJECT_ID), async (c) => {
  const claims = c.get('claims');
  const uid = requireUid(claims);
  try {
    const body = (await c.req.json()) as { data: Parameters<typeof processStudySession>[1] };
    const ua = c.req.header('user-agent') ?? 'unknown';
    const out = await processStudySession(uid, body.data, await getDb(), ua);
    return c.json({ data: out });
  } catch (e) {
    const w = e instanceof WorkerError ? e.toResponse() : { status: 500, body: { ok: false, error: 'internal', message: (e as Error).message } };
    return c.json(w.body, w.status as 500);
  }
});

// Catch-all 404 in JSON shape so client error handling is consistent.
app.notFound((c) =>
  c.json({ ok: false, error: 'not_found', path: new URL(c.req.url).pathname }, 404),
);
