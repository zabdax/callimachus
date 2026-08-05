# Cloudflare Worker API

This Worker provides the authenticated server boundary for HSC Crackers. Firebase Auth and Firestore remain the identity/data platform; Cloudflare Workers runs validation, study-session processing, payment approval, and protected data export.

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
wrangler secret put FIREBASE_ACCESS_TOKEN
```

The access token must belong to a least-privilege service account and be refreshed before expiration. The Worker fails closed when Firebase configuration is unavailable.

`ALLOWED_ORIGINS` is a comma-separated allowlist of the deployed web origin(s). Update it before shipping a custom Pages domain.

## Local commands

```bash
npm ci
npm test
npm run build
npm run dev
```

Use `wrangler deploy --dry-run` for a configuration/bundle check; it does not replace full authenticated integration testing.
