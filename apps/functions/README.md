# HSC Tracker — Functions (Gen 2, TypeScript)

## Local dev

- `npm install`
- `npm run serve` — builds + starts Firebase emulator (Firestore + Functions). Requires JDK 17+.

## Deploy

- `npm run deploy` — `firebase deploy --only functions`

## Functions in Plan 1

| Function | Trigger | Purpose |
|---|---|---|
| `onboardingProfile` | callable | Creates `/users/{uid}` doc with 7-day trial, batchHistory, subscription status `trial`, timezone `Asia/Dhaka`. |
| `recomputeBatchStatusCron` | scheduled `0 0 * * *` Asia/Dhaka | Daily pass over `/batches/*` updating the `status` field. |
| `recomputeBatchStatusCallable` | callable (auth required) | Manual admin trigger that returns `{ updated: N }`. |
| `scheduledRevisions` | `firestore.onDocumentWritten` `users/{uid}/syllabus/{subjectId}` | Creates 3 auto-SR `upcomingTasks` (1st Rev +7d, 2nd Rev +14d, 3rd Rev +30d) the first time a chapter's `firstStudy` flag flips true. |
