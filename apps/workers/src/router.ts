import { Hono } from 'hono';
import { requireAuth, requireAdmin, type AuthVariables } from './auth.js';
import { processStudySession } from './handlers/processStudySession.js';
import { sessionStart } from './handlers/sessionStart.js';
import { generateSignedUploadUrl } from './handlers/generateSignedUploadUrl.js';
import { approvePayment } from './handlers/approvePayment.js';
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

// Session 4: signed uploads (R2) + admin approval.
async function getR2() {
  const mod = await import('./r2.js');
  return mod.r2Signer;
}

async function getAdmins() {
  const mod = await import('./firebase-admin.js');
  return {
    isAdmin: (uid: string) => mod.firestoreAdapter
      // Use a private helper — expose isAdmin via getDoc on /admins/{uid}.
      .getPaymentRequest(`__admin_probe__/${uid}`)
      .then(() => true)
      .catch(() => false),
  };
}

async function getAudit() {
  return {
    log: async (entry: Parameters<NonNullable<Parameters<typeof approvePayment>[4]>['log']>[0]) => {
      // Audit log: write to /audit/{autoId} via Firestore REST. For
      // scaffold we use a stable id derived from the timestamp+target.
      // Session 8 will switch this to the :commit auto-id endpoint.
      const id = `${entry.at ?? Date.now()}-${entry.target}`;
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID ?? 'test'}/databases/(default)/documents/audit?id=${encodeURIComponent(id)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.FIREBASE_ACCESS_TOKEN ?? 'test-token'}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: { actor: { stringValue: entry.actor }, action: { stringValue: entry.action }, target: { stringValue: entry.target } } }),
        },
      );
    },
  };
}

app.post('/api/generateSignedUploadUrl', requireAuth(PROJECT_ID), async (c) => {
  const claims = c.get('claims');
  const uid = requireUid(claims);
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      data?: { contentType?: string; fileExt?: string };
    };
    const contentType = body.data?.contentType ?? '';
    const fileExt = body.data?.fileExt;
    const out = await generateSignedUploadUrl(uid, { contentType, fileExt }, await getR2());
    return c.json({ data: out });
  } catch (e) {
    const w = e instanceof WorkerError ? e.toResponse() : { status: 500, body: { ok: false, error: 'internal', message: (e as Error).message } };
    return c.json(w.body, w.status as 500);
  }
});

app.post('/api/approvePayment', requireAuth(PROJECT_ID), requireAdmin(), async (c) => {
  const claims = c.get('claims');
  const adminUid = requireUid(claims);
  try {
    const body = (await c.req.json()) as { data: { paymentRequestId: string } };
    const out = await approvePayment(
      adminUid,
      body.data,
      await getDb(),
      await getAdmins(),
      await getAudit(),
    );
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
