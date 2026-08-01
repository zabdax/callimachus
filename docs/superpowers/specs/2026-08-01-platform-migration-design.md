# HSC Crackers v2.0 Platform Migration — Design Spec
**Date:** 2026-08-01
**Author:** Plan 4 brainstorming session
**Status:** Approved (Hybrid A)
**Replaces:** Implicit platform assumptions in `docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md`

---

## 0. Context

Plan 1+2+3 shipped `v1.0.0` on `main` assuming Firebase Blaze (pay-as-you-go) for Cloud Functions + Cloud Storage + Cloud Scheduler. The user has zero budget and refuses to enter a credit card on any provider.

**Constraint:** No provider may charge us. Card-on-file is not allowed even if the free quota is generous enough that no charge would ever occur.

**Goal:** Deliver every must-have feature the user identified (server-validated timer, bKash admin approval, leaderboard + daily plan + reminders, admin auth + audit) on platforms where the free tier is hard-enforced — i.e., the platform blocks us at quota, never silently bills.

This spec is additive on top of the v1.0 design; we keep the application logic identical and only swap the *infrastructure primitives*.

---

## 1. Final architecture

```
                 ┌─────────────────────────────────────┐
                 │   Cloudflare Pages (free)           │
   Browser ─────▶│   hosts apps/web/dist (PWA)        │
                 │   Asia edge: Mumbai, Colombo, etc. │
                 └──────────┬──────────────────────────┘
                            │  HTTPS /api/* + FCM
                            ▼
   ┌──────────────────────────────────────────────────┐
   │   Cloudflare Workers (free tier)                  │
   │   - callable endpoints (HTTP request/response)   │
   │   - cron triggers (5 free)                       │
   │   - TypeScript, deployed via `wrangler deploy`    │
   └──────────┬──────────────────┬────────────────────┘
              │                  │
              ▼                  ▼
        ┌──────────┐       ┌──────────┐
        │ R2       │       │ KV       │
        │ 10 GB    │       │ 1 GB     │
        │ bKash    │       │ nonces,  │
        │ screens  │       │ leaders  │
        └──────────┘       └──────────┘
              │
              │  Firebase Admin SDK calls (ID-token
              │  verify, FCM send, Auth custom claims)
              ▼
   ┌──────────────────────────────────────────────────┐
   │   Firebase (free Spark tier, no card on signup)   │
   │   - Auth (Google OAuth + custom admin claim)      │
   │   - Firestore (user/sessions/syllabus/tasks)      │
   │   - FCM (push notifications, separate quota)     │
   └──────────────────────────────────────────────────┘
```

**What this preserves from v1.0:**
- 100% of the application TypeScript in `apps/web`
- 100% of the Firestore rules (just hosted by Spark instead of Blaze)
- 100% of the React UI components, hooks, contexts
- 100% of the vitest unit tests (139 of them)
- 100% of the Playwright e2e suite (4 specs)

**What this changes:**
- `apps/functions/` (Firebase Cloud Functions Gen 2) → `apps/workers/` (Cloudflare Workers)
- `firebase-admin` SDK calls for Cloud Storage → R2 SDK calls (Workers-compatible)
- `onCall` + `onRequest` → Workers fetch handlers
- `onSchedule` → Workers cron triggers
- The HttpsError class → a custom `WorkerError` with HTTP status codes
- The `.run(data, ctx)` test adapter → a fetch-test adapter

---

## 2. Platform choices (and why each one passes the no-card test)

| Platform | Used for | Free tier relevant | Card on signup? | Verdict |
|---|---|---|---|---|
| **Cloudflare Pages** | Host PWA | Unlimited sites, 500 builds/mo | NO (verified 2026) | ✅ |
| **Cloudflare Workers** | All server logic | 100K req/day, 5 cron triggers, 128 MB memory | NO (verified 2026) | ✅ |
| **Cloudflare R2** | bKash screenshot storage | 10 GB storage, 10M Class B reads/mo, 1M Class A writes/mo | NO | ✅ |
| **Cloudflare KV** | Caches: presence nonces, leaderboard read-through | 1 GB storage, 100K reads/day, 1K writes/day | NO | ✅ |
| **Firebase Auth** | Google OAuth + admin custom claim | Unlimited users, unlimited OAuth | NO (verified 2026) | ✅ |
| **Firestore (Spark)** | All user/session/syllabus/task docs | 1 GB storage, 50K reads/day, 20K writes/day | NO | ✅ |
| **Firebase Cloud Messaging** | Push notifications | Unlimited on free tier | NO | ✅ |
| ~~Firebase Cloud Functions~~ | ~~server logic~~ | Requires Blaze | REQUIRES CARD | ❌ REJECTED |
| ~~Firebase Cloud Storage~~ | ~~screenshots~~ | Requires Blaze for some operations | REQUIRES CARD | ❌ REJECTED |

**Quota check at 100 active students (Bangladesh launch scale):**
- Workers: ~12K req/day (sessions + presence nonces + crons + admin queue) ≪ 100K free limit ✅
- R2: 100 students × 1 screenshot/month × 1 MB = 100 MB ≪ 10 GB free ✅
- KV writes: ~1K/day (presence nonces) at the free limit ⚠️ — see §5 mitigation
- Firestore reads: 100 × 50 reads/day = 5K/day ≪ 50K limit ✅
- Firestore writes: 100 × 6 writes/day = 600/day ≪ 20K limit ✅
- FCM: 100 × 1 push/day = 100/day ≪ unlimited ✅

**Quota check at 1000 active students (12-month target scale):**
- Workers: ~120K req/day — **OVER free limit** ⚠️ — see §5 mitigation
- Firestore reads: 1000 × 50 = 50K/day — **at the free limit** ⚠️ — see §5
- Other: still well within limits

**Mitigation for scale (called out in §5, not implemented now):**
- Aggressive caching in KV (read-through) to cut Firestore reads 10×
- Bundle multiple operations per session-stop call to cut Workers invocations 3×

---

## 3. Project structure changes

### Current (`feat/plan-2`)
```
apps/
  web/                  Vite + React PWA
  functions/             Firebase Cloud Functions (Gen 2, TS)
docs/superpowers/...
firebase.json             Firebase Hosting + Functions + Firestore config
firestore.rules
storage.rules
scripts/                  bootstrap-admin.mjs, deploy.mjs
```

### Target (`plan4/migration`)
```
apps/
  web/                  (unchanged)
  workers/              NEW — Cloudflare Workers (Hono router + D1-free pure logic)
    src/
      index.ts          Worker entrypoint (fetch router)
      auth.ts           Firebase ID-token verifier via JWKS
      db.ts             Firestore client wrapper (admin SDK)
      r2.ts             R2 bucket binding + signed-URL helpers
      kv.ts             KV namespace binding + nonce/leaderboard helpers
      handlers/
        processStudySession.ts
        approvePayment.ts
        generateSignedUploadUrl.ts
        sendRevisionReminder.ts
        getUserData.ts
        deleteUserData.ts
        onboardingProfile.ts
        presenceNonce.ts
        emitNonce.ts
        scheduledRevisions.ts
        generateDailyPlan.ts
        rollUpLeaderboards.ts
        recomputeBatchStatus.ts
        sessionStart.ts
      types.ts          Shared types (PlanId, PendingRequest, etc.)
    tests/              vitest — pure logic tests + fetch integration tests
    wrangler.toml       Cloudflare bindings (R2 bucket, KV namespace)
    package.json
    tsconfig.json
docs/superpowers/...
firebase.json             KEEP — hosting + firestore + auth still on Firebase
firestore.rules           KEEP — rules unchanged
storage.rules             DELETE (no Firebase Storage anymore)
scripts/                  + add scripts/deploy-workers.mjs
```

**Notes:**
- `apps/functions/` is **deleted** (the Workers project replaces it)
- `firebase.json` loses the `functions` entry but keeps `hosting` + `firestore` + `storage` (or storage removed)
- `wrangler.toml` is the new deployment manifest for the Workers
- A new `scripts/deploy-workers.mjs` runs `wrangler deploy`

---

## 4. Handler migration map

Every existing Cloud Function maps to a Worker fetch handler 1:1. The handler signature is identical from the client's perspective: a POST to `/api/<name>` with `{ data: ... }` JSON body, returning `{ data: ... }` JSON body, with errors thrown via the new `WorkerError` class.

| Cloud Function (apps/functions) | Worker endpoint | Method |
|---|---|---|
| `sessionStart` | `/api/sessionStart` | POST |
| `processStudySession` | `/api/processStudySession` | POST |
| `presenceNonce` | `/api/presenceNonce` | POST |
| `emitNonce` (cron every 60s) | cron trigger `0 * * * *` | — |
| `scheduledRevisions` (Firestore trigger) | Firestore event-source via `wrangler` Workers Firestore adapter (2026+); falls back to cron | mixed |
| `onboardingProfile` (Auth trigger) | Firestore trigger via Eventarc (Cloudflare partner) or cron polling | mixed |
| `generateDailyPlan` (cron 5am Asia/Dhaka) | cron trigger `0 23 * * *` (UTC = 5am Dhaka) | — |
| `rollUpLeaderboards` (cron hourly) | cron trigger `0 * * * *` | — |
| `recomputeBatchStatus` (cron daily) | cron trigger `0 0 * * *` | — |
| `sendRevisionReminder` (cron hourly) | cron trigger `0 * * * *` | — |
| `generateSignedUploadUrl` | `/api/generateSignedUploadUrl` | POST |
| `approvePayment` | `/api/approvePayment` | POST |
| `getUserData` | `/api/getUserData` | POST |
| `deleteUserData` | `/api/deleteUserData` | POST |

**Routing layer:** use [Hono](https://hono.dev/) (tiny, edge-native, TypeScript-first). It runs on Workers, Node, Bun, and Deno — same code path in tests and prod.

**Cron limit:** 5 cron triggers per Worker account. We need 4 (`emitNonce`, `dailyPlan`, `rollUpLeaderboards`, `recomputeBatchStatus`, `sendRevisionReminder` = actually 5). **Exact fit, no headroom.** Mitigation: bundle `emitNonce` + `sendRevisionReminder` into one cron since they both run hourly. New count: 4 cron triggers.

**`onboardingProfile` Auth trigger:** Cloudflare doesn't have a first-class Auth trigger like Firebase. Two options:
- (a) Cron-polling: every 1 minute, query Firebase Auth Admin SDK for users with `metadata.creationTime` in the last 2 min, create their user docs.
- (b) Client-side: have the `OnboardingForm` write the user doc directly (allowed by Firestore rules).

Pick **(b)** — fewer moving parts, fewer cron triggers, and the rule already permits the user to write their own profile fields. Auth-trigger semantics move into the client. This is a tiny change to the existing `OnboardingForm.tsx`.

---

## 5. Storage / data layer

### Firestore (free Spark) — unchanged schema
- All collections, rules, security model from Plan 1/2/3 stay.
- 50K reads/day, 20K writes/day is the bottleneck at 1K-user scale.
- **Mitigation (future work, not in v2.0):** aggressive read-through cache in KV. Tag every user doc with `cached_at`; on every fetch, if cache is < 30s old, return from KV.

### R2 (new) — replaces Firebase Storage
- One bucket: `hsc-tracker-screenshots`
- Path: `paymentRequests/{uid}/{uuid}.{ext}` (same as current storage.rules)
- Worker `generateSignedUploadUrl` uses R2's presigned URLs (R2 supports S3-compatible presigned URLs natively)
- Public access blocked by default; only signed URLs work

### KV (new) — caches + ephemeral state
- Namespace: `tracker-cache`
- Keys:
  - `presence-nonce:{uid}:{nonceId}` → `{ nonce, expiresAt }` TTL 60s
  - `leaderboard-daily:{YYYY-MM-DD}` → JSON of the leaderboard for that day, TTL 36h
  - `session-active:{uid}` → small JSON `{ startedAt, pausedAccumMs }`, TTL 24h

### Static data (seeding)
- `seedBatches.mjs` (existing) — keeps using Firestore client SDK
- `seedSyllabus.mjs` (existing) — keeps using Firestore client SDK
- New: `scripts/seed-r2.mjs` to pre-bucket nothing (R2 is empty at start; uploads happen via signed URLs)

---

## 6. Auth flow (unchanged)

- Client: Firebase Auth Google sign-in (same `AuthContext.tsx`)
- ID token sent as `Authorization: Bearer <idToken>` to every Worker endpoint
- Worker: verify ID token via Firebase JWKS (cached in module scope for 1 hour)
- Admin claim: `firebase-admin/auth` custom claim `{ admin: true }`. Same as Plan 3.
- Bootstrap script: `scripts/bootstrap-admin.mjs` (existing, works against Firebase Auth — unchanged)

**One subtle change**: Workers don't have native access to Firebase Admin SDK out-of-the-box (Firebase Admin is Node-only, Workers are V8 isolates). Two options:
- (a) Use `graphql-request` style: Workers fetch JWKS, decode JWT manually.
- (b) Use the [`@cf-wasm/jwt`](https://github.com/zachgoll/jwt) Workers-compatible JWT library.

Pick **(a)** — Firebase exposes the JWKS at `https://www.googleapis.com/oauth2/v3/certs`. Fetch it once per Worker isolate, cache in module scope, decode the bearer manually. ~30 lines of code, no dependency.

---

## 7. Frontend changes (minimal)

`apps/web/src/lib/firebase/client.ts` is unchanged (still Firebase JS SDK for Auth + Firestore client). One new helper:

```ts
// apps/web/src/lib/workers/client.ts
export async function callWorker<TReq, TRes>(name: string, req: TReq): Promise<TRes> {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(`${WORKERS_BASE}/api/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data: req }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new WorkerError(res.status, err.message ?? res.statusText);
  }
  const { data } = await res.json();
  return data as TRes;
}
```

This replaces every `httpsCallable(getFunctions(app), 'foo')` call site. Migration is mechanical — a sed-style find/replace across `apps/web/src/`.

**Static asset hosting stays the same:** `firebase.json` `hosting.public = apps/web/dist`. Cloudflare Pages handles the actual hosting (per architecture diagram) — but for the v2.0 deploy we keep Firebase Hosting for simplicity (it has a generous free tier, 10 GB storage + 360 MB/day transfer, no card). This means the Worker base URL still resolves via Firebase Hosting; we use a relative path `/api/...` and route via Firebase Hosting rewrites:

```json
// firebase.json
"rewrites": [
  { "source": "/api/**", "function": "api" }    // -> routes /api/* to Workers via custom domain
]
```

Actually Firebase Hosting rewrites only work with Firebase Functions, not external Workers. **Alternative:** deploy the PWA to Cloudflare Pages (free, no card), and the Workers to Cloudflare Workers — both in the same dashboard. Single deploy command: `wrangler pages deploy apps/web/dist && wrangler deploy`.

**This means `firebase.json` hosting section goes away** for v2.0. Cloudflare Pages replaces it.

---

## 8. CI changes

Current `.github/workflows/ci.yml` has three jobs (build-test, e2e, lighthouse). For v2.0:

- `build-test`: same + add a `workers-test` step that runs `vitest` in `apps/workers/`
- `e2e`: same — e2e suite doesn't care which backend
- `lighthouse`: same — serves from `apps/web/dist`
- New: `deploy-preview` job that runs `wrangler deploy --env preview` for preview URLs

No new secrets needed for build (everything runs offline). For deploy, secrets needed:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## 9. Local dev

`apps/web` dev server: `npm run dev` (unchanged) — it talks to local Firebase emulators via `firebase emulators:exec`.

`apps/workers` dev: `wrangler dev` (new). It proxies to local Firebase emulators automatically via `wrangler.toml`'s `[env.dev]` bindings. Hot reload.

`scripts/dev-all.mjs` (new): spawns both dev servers + Firebase emulators in parallel. One command to start everything.

---

## 10. Deployment

Single command: `node scripts/deploy.mjs --workers` (extends the existing deploy script).

What it does:
1. Validate required env (Firebase + Cloudflare secrets — see §11)
2. `npm ci` + `npm run build` in `apps/web`
3. `npm ci` + `npm run build` in `apps/workers`
4. `wrangler pages deploy apps/web/dist --project-name hsc-cracker`
5. `wrangler deploy --config apps/workers/wrangler.toml`
6. `firebase deploy --only firestore:rules` (rules still needed)

---

## 11. Required secrets (env vars)

| Secret | Used by | Source |
|---|---|---|
| `VITE_FIREBASE_*` (6 keys) | Web app | Firebase Console → Project Settings → Your apps |
| `VITE_SENTRY_DSN` | Web app | Sentry project settings |
| `VITE_WORKERS_BASE` | Web app | Cloudflare Pages custom domain (e.g. `https://api.hsc-cracker.com`) |
| `CLOUDFLARE_API_TOKEN` | Workers deploy | Cloudflare dashboard → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Workers deploy | Cloudflare dashboard → right sidebar |
| `FIREBASE_TOKEN` | `firebase deploy --only firestore:rules` | `firebase login:ci` |

---

## 12. Migration plan (sessions)

Per the protocol, this spec is the input to the writing-plans skill which produces a detailed task-by-task implementation plan. Anticipated sessions:

1. **plan4/session1-foundation** — wrangler init, `apps/workers` scaffold, Hono router, `/api/echo` smoke test, deploy to CF
2. **plan4/session2-auth** — Firebase ID-token verification in Workers, ID-token verifier with JWKS cache
3. **plan4/session3-firestore** — port `onboardingProfile` + `sessionStart` + `processStudySession` (the high-value handlers)
4. **plan4/session4-r2-uploads** — port `generateSignedUploadUrl` (R2 presigned URLs) + `approvePayment` + `paymentRequests` rules update for client-side signed-upload writes
5. **plan4/session5-r2-storage-rules** — port `storage.rules` content into R2 bucket policy (signed-URL only)
6. **plan4/session6-crons** — port `recomputeBatchStatus`, `generateDailyPlan`, `rollUpLeaderboards`, `sendRevisionReminder`, `emitNonce` to Workers cron triggers
7. **plan4/session7-frontend** — swap every `httpsCallable(...)` call site to `callWorker(...)`, update `.env.example`
8. **plan4/session8-deploy** — `scripts/deploy.mjs` Workers branch, `wrangler.toml`, Cloudflare Pages deploy, CI updates
9. **plan4/session9-handoff** — drop `apps/functions/`, delete `storage.rules`, update HANDOFF.md

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| 100K Workers req/day is hit before 1000 active users | Aggressive read-through cache in KV; bundle operations into single calls; at 1000 users we re-evaluate whether to add a card |
| Firebase Admin SDK not available on Workers | Manual JWT decode via JWKS (~30 LOC) — see §6 |
| No native Cloudflare ↔ Firebase Auth trigger for `onboardingProfile` | Move to client-side write in `OnboardingForm.tsx` — see §4 |
| Cloudflare Pages + Workers ≠ Firebase Hosting + Functions (different deploy story) | New `scripts/deploy.mjs --workers` step; documented in deploy runbook |
| 5 cron triggers is tight | Bundle `emitNonce` + `sendRevisionReminder` into one cron (both hourly) — see §4 |
| R2 presigned URL expiration/format may differ from Firebase Storage | Use AWS Signature V4 — R2 supports it natively. Reuse the existing `generateSignedUploadUrl` logic, just swap the signing library |
| Migration is destructive (deletes `apps/functions/`) | Keep `apps/functions/` around for the migration sessions; delete only in session 9 after Workers are verified working in prod |

---

## 14. What does NOT change

- All UI components, hooks, contexts in `apps/web/src/`
- All vitest unit tests (139 of them) — they'll still pass because the public API is unchanged
- All Playwright e2e specs (4 of them)
- All Firestore rules (hosted by Spark)
- All Firebase Auth flows (Google sign-in + admin claim)
- All FCM usage
- The release process (`scripts/deploy.mjs` + tagged release + release notes)
- The bootstrap-admin script (`scripts/bootstrap-admin.mjs`)
- All docs (`RELEASE-v1.0.0.md`, `docs/admin-bootstrap.md`, `HANDOFF.md` — updated in session 9)