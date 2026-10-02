# HSC Tracker — Web

## Local dev

1. `cp .env.example .env` and fill `VITE_SUPABASE_*` keys.
2. `npm install`
3. `npm run dev` — http://localhost:5173

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — TypeScript check + Vite build to `dist/`
- `npm test` — Vitest unit + component
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run seed:batches` — Seed `batches` table (needs `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`)
- `npm run verify:batch-dates` — Print batch dates for admin verification
- `npm run seed:syllabus` — Seed `curriculum` (bangla medium)

## Notes

- Syllabus data is **re-typed**, not scraped.
- Batch dates are placeholders — admin must verify against the Bangladesh
  Education Board schedule before launch.
- i18n: every UI string is a `t()` call. English is complete; Bangla is a
  stub for Plan 1. Real Bangla translations land in Plan 3 (Task N).
- Routes: `/sign-in`, `/auth/callback`, `/onboarding`, `/` (home shell), `/syllabus`, `/tasks`.
- Auth + data run on Supabase (Auth with Google OAuth + email/password, Postgres with RLS).
