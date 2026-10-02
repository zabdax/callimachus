# Cloudflare Worker API

This Worker provides the authenticated server boundary for HSC Crackers. Supabase is the identity/data platform (Auth + Postgres with RLS); Cloudflare Workers runs validation, study-session processing, payment approval, and protected data export.

## Routes

- `GET /api/echo` — deployment smoke check.
- `GET /api/private/me` — authenticated account diagnostics.
- `POST /api/sessionStart` — creates a server-owned study-session anchor.
- `POST /api/processStudySession` — validates and persists a completed study session.
- `POST /api/approvePayment` — admin-only pending-payment approval.
- `POST /api/getUserData` — authenticated export for the requesting user only.

## Required bindings

`wrangler.toml` defines non-secret values and KV. Set the following secret outside source control:

```bash
wrangler secret put SUPABASE_SERVICE_KEY
```

The service_role key is static (no rotation). Find it in the Supabase dashboard under Project Settings → API. The Worker fails closed when Supabase configuration is unavailable.

`ALLOWED_ORIGINS` is a comma-separated allowlist of the deployed web origin(s). Update it before shipping a custom Pages domain.

## Local commands

```bash
npm ci
npm test
npm run build
npm run dev
```

Use `wrangler deploy --dry-run` for a configuration/bundle check; it does not replace full authenticated integration testing.
