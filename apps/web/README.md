# HSC Tracker — Web

## Local dev

1. `cp .env.example .env` and fill `VITE_FIREBASE_*` keys.
2. `npm install`
3. `npm run dev` — http://localhost:5173

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — TypeScript check + Vite build to `dist/`
- `npm test` — Vitest unit + component (excludes emulator-required `tests/rules`)
- `npm run test:rules` — `@firebase/rules-unit-testing` (needs Firestore emulator + JDK 17+)
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run seed:batches` — Seed `/batches/HSC-2024` … `/batches/HSC-2030`
- `npm run verify:batch-dates` — Print batch dates for admin verification
- `npm run seed:syllabus` — Seed `/syllabus/board/bangla/{subjectId}`

## Notes

- Syllabus data is **re-typed**, not scraped.
- Batch dates are placeholders — admin must verify against the Bangladesh
  Education Board schedule before launch.
- i18n: every UI string is a `t()` call. English is complete; Bangla is a
  stub for Plan 1. Real Bangla translations land in Plan 3 (Task N).
- Routes: `/sign-in`, `/onboarding`, `/` (home shell), `/syllabus`, `/tasks`.
- Bundle size warning is expected — Firebase JS SDK alone is ~150KB
  gzipped. Plan 3 (M8) budgets the initial JS to ≤ 250KB gzipped.
