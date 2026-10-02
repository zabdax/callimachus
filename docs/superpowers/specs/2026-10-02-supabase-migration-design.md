# Supabase migration design (Auth + data, fresh start)

Date: 2026-10-02
Status: approved in brainstorming (sections 1-3)
Goal: eliminate the Firebase Auth Google redirect loop and the Firebase backend
rotation/rules pain by moving auth + data to Supabase. Fresh start: no user or
data migration (Google users re-link, email users sign up again).

## Context

- Web: Vite + React + TS PWA on Vercel (`hsc-crackers`) and Cloudflare Pages.
- API: Cloudflare Workers + Hono (`apps/workers`), Firestore via REST with a
  `FIREBASE_ACCESS_TOKEN` (GCP OAuth2 `ya29...`) rotated every 50 minutes by
  `.github/workflows/rotate-firebase-access-token.yml`.
- Auth today: Firebase `signInWithRedirect` (Google) + `signInWithEmailAndPassword`.
  Failure mode is a silent loop back to `/sign-in`: Tracking Prevention blocks
  `apis.google.com` iframe storage and the redirect session is dropped
  (`AuthContext`, `workers/client`, onboarding `createdAt` fixes already shipped
  in #12, storage-blocked surfacing in #14).
- Decision: full Supabase (Auth + Postgres). Auth-only swap was rejected because
  it keeps the rotation cron + Firestore rules. Cloudflare-native D1 + custom
  sessions was rejected as more custom auth code than Supabase.

## Architecture

- Web uses `@supabase/supabase-js` (PKCE). Session lives in first-party
  `localStorage` on our own origin with `refresh_token` rotation. No GAPI iframe
  storage dependency, no `__/auth/handler` on a foreign origin.
- Google: `signInWithOAuth({ provider: 'google' })` -> Google -> our own
  `/auth/callback?code=...` -> `exchangeCodeForSession()` -> session.
- Email: `signUp` / `signInWithPassword` (fresh accounts; no hash import exists).
- Postgres holds all domain data. RLS enforces owner-only client access.
- Worker keeps Hono routes and CORS shape. It verifies the Supabase JWT
  (Supabase JWKS) in `requireAuth`, keeps `requireAdmin`, and uses one static
  `SUPABASE_SERVICE_KEY` for privileged writes. No token rotation anywhere.
- Secrets: public `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; worker secrets
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` (set once via
  `wrangler secret put`; static, no cron).

## Data model (new tables, fresh)

- `profiles(id uuid pk references auth.users, display_name, college, batch_id,
  medium, timezone, created_at, updated_at)`
- `study_sessions(id, uid, date, duration_sec, chapters, created_at)`
- `syllabus_items`, `tasks` (uid-scoped, same shape as today's Firestore docs)
- `batches(id, college_start, exam_start, exam_end, status, updated_at)`
- `payment_requests(id, uid, plan_id, trx_id, status, created_at)`
- `leaderboard_daily(date, total_duration_sec, active_user_count)` +
  `leaderboard_daily_users(date, uid, duration_sec)`; same pair for monthly
- `audit_log(id, actor, action, target, after, at_ms, created_at)`

RLS (enforced in SQL migration, verified by tests):

- `profiles/sessions/syllabus/tasks`: authenticated may select/insert/update
  only rows with `uid = auth.uid()` (profiles keyed by id = auth.uid()).
- `batches`: select for authenticated; writes service-key only.
- Leaderboard totals: select authenticated, writes service-key only; per-user
  rows: owner or admin.
- `payment_requests`: insert own row with `status = 'pending'`; no client
  update/delete.
- `audit_log`: service-key only.

## Auth flows and error handling

- `RequireAuth`: no Supabase session -> `/sign-in` (keeps `from`).
- `RequireProfile`: session without `profiles` row (or without `batch_id`) ->
  `/onboarding`.
- `/auth/callback`: exchanges `code`, shows finishing spinner, routes onward;
  exchange errors surface the same friendly error box as sign-in.
- Error mapping: bad credentials collapsed to one message (no enumeration);
  `storage-blocked` probe (localStorage write + `cookieEnabled`) kept from #14
  and shown with browser exception steps instead of looping.
- Offline timer replay keeps working: replay keyed by Supabase user id.

## Code changes

Web (`apps/web`):

- Remove `firebase` dependency, `src/lib/firebase/*`, all direct Firestore
  reads/writes (`useProfile`, onboarding `setDoc`, syllabus/tasks/admin reads).
- Add Supabase client module with missing-env fail-fast log (same pattern as
  today's Firebase client validation).
- Add `/auth/callback` route; update `guards.tsx`, `AuthContext`
  (session provider), `SignInScreen` (OAuth button + email form), worker
  client (send `Authorization: Bearer <supabase access_token>`, keep
  force-refresh retry on 401).
- Keep API route names (`sessionStart`, `processStudySession`,
  `approvePayment`, `getUserData`) so the frontend diff stays small.

Worker (`apps/workers`):

- Replace `src/auth.ts` (Firebase JWKS) with Supabase JWT verification and
  the same `requireAuth`/`requireAdmin` interface.
- Replace `src/firebase-admin.ts` Firestore REST with a Supabase
  service-key client (same adapter interface: sessions, leaderboard,
  subscriptions, payments, export, audit, crons).
- `GET /api/health` reports Supabase reachability (no secret leakage).

Deletions:

- `.github/workflows/rotate-firebase-access-token.yml`,
  `scripts/src/mint-firebase-token.mjs`, `firestore.rules`,
  `firestore.indexes.json`, `firebase.json` Firestore block, Firebase web
  dependency and Firebase-related docs/SETUP references.

## Cutover plan (high level; detailed plan comes from writing-plans)

1. Create Supabase project; configure Google OAuth client (authorized origins
   = Vercel + Pages URLs; redirect = Supabase callback URL).
2. Apply SQL migration (tables + RLS + indexes for `payment_requests` pending
   queue and leaderboard keys).
3. Set Vercel/CI env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and worker
   secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`).
4. Deploy worker, then web; smoke test: Google login, email signup/login,
   onboarding, session start/stop, offline replay, payment request, admin
   approval, export.
5. Decommission Firebase project only after green smoke tests.

## Success criteria

- Google + email login work in Edge strict-tracking-prevention (with site
  exception) and in Chrome default with zero silent loops; storage-blocked
  shows the actionable message.
- No scheduled token rotation; `/api/health` 200 with Supabase connectivity.
- Existing quality gates unchanged: `apps/web` vitest + `apps/workers` vitest
  + `tsc` + `eslint` green; e2e covers sign-in, onboarding, session, subscribe.

## Risks

- Supabase Auth email deliverability and Google OAuth consent configuration
  are new operational surfaces; mitigated by keeping the friendly error box
  and the storage probe.
- RLS misconfiguration could over-expose rows; mitigated by service-key-only
  writes for aggregates/payments/audit and RLS tests in CI.
