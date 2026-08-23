# Deploying the web app to Vercel

The web app is a static Vite build, so Vercel hosts it as-is. The API stays
on the Cloudflare Worker and data stays on Firebase — only the static host
changes. `apps/web/vercel.json` already sets the framework, build command,
SPA rewrites, Node engine, and service-worker cache headers.

> Env-var names below are identical to `.github/workflows/ci.yml`.
> Never commit real values — see `PRIVATE.md`.

## 1. Import the repo

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo.
2. **Root Directory**: `apps/web` (everything else is auto-detected from
   `apps/web/vercel.json`: Vite preset, `npm run build`, output `dist`).
3. Add the environment variables below for **Production and Preview**.
   They are read at build time (`vite.config.ts` bakes them in), so any
   change requires a redeploy.

| Variable | Required | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | yes | public web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | e.g. `xxx.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | yes | |
| `VITE_FIREBASE_STORAGE_BUCKET` | yes | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | |
| `VITE_FIREBASE_APP_ID` | yes | |
| `VITE_WORKERS_BASE` | yes | the Cloudflare Worker origin, e.g. `https://<worker>.<account>.workers.dev` — the app defaults to same-origin calls, which would 404 on Vercel |
| `VITE_SENTRY_DSN` | no | omit to disable Sentry |
| `VITE_SENTRY_ENVIRONMENT` | no | e.g. `vercel-production` |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | no | omit to disable App Check |

4. Deploy. Every push builds a Production deploy (main) or Preview deploy
   (other branches / PRs).

## 2. Firebase — authorize the new domain (mandatory)

Google sign-in throws `auth/unauthorized-domain` until you add the host:
Firebase console → **Authentication → Settings → Authorized domains** → add
`<project>.vercel.app` (and any custom domain later).

## 3. Cloudflare Worker — allow the new origin (mandatory)

Protected actions (session submit, payment, export) are CORS-checked by
the Worker against the `ALLOWED_ORIGINS` **var** in
`apps/workers/wrangler.toml` (it is not a secret — it stays versioned).
Plain entries match exactly; `*.` / `*-` entries match any host with that
suffix, so `*-<scope>.vercel.app` lets every preview deployment of the
Vercel project through automatically. Edit the list, then ship it:

```bash
cd apps/workers
npm run build
npx wrangler deploy
```

Verify a preflight (expect `204` and the origin echoed back):

```bash
curl -i -X OPTIONS https://<worker-origin>/api/echo \
  -H 'Origin: https://<project>.vercel.app' \
  -H 'Access-Control-Request-Method: POST'
```

## 4. Verify a deployment

- `/welcome` renders the landing (3D constellation).
- `/` redirects to `/sign-in`.
- Google sign-in starts (no `auth/unauthorized-domain`).
- Start → stop a study session (Worker CORS + Firebase all wired).

## CLI alternative

```bash
npx vercel login          # once
cd apps/web
npx vercel link           # bind to the imported project
npx vercel env pull       # optional: sync dashboard env to .env.local
npx vercel deploy         # preview
npx vercel deploy --prod  # production
```
