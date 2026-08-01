import { Hono } from 'hono';

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

// Catch-all 404 in JSON shape so client error handling is consistent.
app.notFound((c) =>
  c.json({ ok: false, error: 'not_found', path: new URL(c.req.url).pathname }, 404),
);
