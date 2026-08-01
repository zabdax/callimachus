import { app } from './router.js';

/**
 * Worker entrypoint. Plan 4 / session 1 is scaffold-only: Hono's
 * router is exposed at this entry so a smoke-test request to
 * `/api/echo` returns `{ ok: true, service: "callimachus-workers" }`.
 *
 * Future sessions will:
 *   - session 2: verify Firebase ID tokens via JWKS
 *   - session 3: port Firestore-backed handlers from apps/functions
 *   - session 4: port generateSignedUploadUrl + paymentRequests writes
 *   - session 6: add cron-trigger handlers (presence nonces, daily plan,
 *     roll-up leaderboards, revision reminders)
 *
 * Bindings (R2 bucket, KV namespace) land in those sessions.
 */

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
