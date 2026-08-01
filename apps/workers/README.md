# apps/workers — Cloudflare Workers

Scaffold for the Callimachus Cloudflare Worker. Plan 4 / session 1 only;
real endpoints (processStudySession, approvePayment, generateSignedUploadUrl,
and the cron handlers) land in sessions 2 through 6.

## Layout

```
src/
  index.ts      Worker entrypoint (default export with a `fetch` method).
  router.ts     Hono app; mounted under `/api/...`.
tests/          Vitest specs. Run against the same Hono router the
                Worker entrypoint uses, so prod and tests share the
                route definition.
wrangler.toml   Cloudflare bindings. Empty for session 1; R2 + KV land later.
tsconfig.json   Extends @cloudflare/workers-types. strict + noUncheckedIndexedAccess.
vitest.config.ts
```

## Develop

```bash
npm ci
npm run dev      # wrangler dev (offline; no bindings yet)
```

## Test

```bash
npm test         # vitest run
```

## Build

```bash
npm run build    # tsc --noEmit (we don't emit JS; wrangler bundles on deploy)
```

## Deploy (later sessions only)

```bash
npm run deploy   # wrangler deploy
```

## Why Hono

Hono is tiny, edge-native, and TypeScript-first. It runs on Workers,
Node, Bun, and Deno — same code path in tests and prod. The same
`app.request(url)` we call in tests also runs inside the production
fetch handler.

## References

- Plan: `docs/superpowers/specs/2026-08-01-platform-migration-design.md`
  (Hybrid A; Firebase Auth + Firestore stay; Cloud Functions move here)
