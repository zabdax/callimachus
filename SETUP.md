# Setup — Callimachus

Bring up a working copy of Callimachus from a clean clone. This repo is a
**template**: every credential is a placeholder. You bring your own Firebase
project. Nothing ships to your account until you say so.

> Headed somewhere else? See `README.md` for an overview, or `PRIVATE.md`
> for the list of files that intentionally do **not** live in the public repo.

---

## 0. Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | 20 LTS | PWA + Cloud Functions runtime |
| npm | 10+ | included with Node 20 |
| Git | any recent | obvious |
| Firebase CLI | 13+ | deploy + emulator |
| Java (JDK 17) | 17 | only for the Firestore emulator |

Install the Firebase CLI once:

```bash
npm install -g firebase-tools
firebase login
firebase --version   # should print 13.x or 14.x
```

---

## 1. Clone, install, branch

```bash
git clone https://github.com/<your-account>/callimachus.git
cd callimachus
git checkout -b feat/your-name-first-deploy
```

Install both workspaces:

```bash
( cd apps/web       && npm ci )
( cd apps/functions && npm ci )
( cd scripts        && npm ci )   # only needed if you use deploy/admin helpers
```

---

## 2. Create your Firebase project

This project template assumes **one** Firebase project per environment.

1. Open https://console.firebase.google.com/ → **Add project**.
2. Name it anything (e.g. `callimachus-dev`). Skip Google Analytics if unsure.
3. Inside the new project, enable:
   - **Authentication → Sign-in method → Google** (the only provider wired up).
   - **Firestore Database** → production mode → choose a region close to BD (e.g. `asia-southeast1`).
   - **Functions** → accept the prompt to upgrade to Blaze (the free tier covers this app).
   - **Storage** → start in production mode.
   - **App Check** → register a **reCAPTCHA Enterprise** site for the web app.

4. **Register a Web app** in Project Settings → Your apps → `</>`.
   Firebase shows you a config block. You will paste these values into
   `apps/web/.env` (next step). Do **not** commit those values; only the keys
   (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.) are tracked.

5. **Generate a service account JSON** for local admin scripts:
   - Project Settings → Service Accounts → **Generate new private key**.
   - Save it **outside** this repo, e.g. `~/.config/callimachus/sa.json`.
   - This file is gitignored globally (any `firebase-adminsdk-*.json` is
     rejected by `.gitignore`).

---

## 3. Fill in the env files

There are two templates. Copy each to its target and fill in real values.

```bash
cp apps/web/.env.example              apps/web/.env
cp apps/web/.env.production.example   apps/web/.env.production
```

`apps/web/.env` is read by Vite at dev time. `apps/web/.env.production`
is read only by `scripts/deploy.mjs`; it is git-ignored.

| Variable | Where it comes from |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web app config — `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Web app config — `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | Web app config — `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Web app config — `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web app config — `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | Web app config — `appId` |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | App Check → reCAPTCHA Enterprise site key |
| `VITE_SENTRY_DSN` | Sentry project → Client Keys (optional) |
| `VITE_SENTRY_ENVIRONMENT` | `development` locally, `production` on deploy |
| `VITE_ENABLE_TEST_ROUTES` | `false` always. Only flipped to `true` by CI for Playwright. |

Never commit any of these files. If `git status` shows them, stop and ask.

---

## 4. Run the web app

```bash
cd apps/web
npm run dev
```

Open http://localhost:5173. Sign in with Google. You will land on the
onboarding flow (medium → batch → college). After onboarding, the home
overview and pace card are visible.

Quality gates:

```bash
npm run lint
npm test
npm run test:rules
```

---

## 5. Run the Cloud Functions emulator

```bash
cd apps/functions
npm run serve
```

This boots Firestore, Auth, Functions, and Storage emulators. The web app
auto-detects the emulator when `VITE_USE_EMULATORS=true` is in your `.env`.

---

## 6. Seed batch data

Batches (`HSC-2024` … `HSC-2030`) are seeded once per project.

```bash
cd apps/web
npm run seed:batches
```

Syllabus data is seeded the same way:

```bash
npm run seed:syllabus
```

---

## 7. Promote an admin (optional)

The admin route (`/admin/approvals`) is gated on a Firebase Auth custom
claim `{ admin: true }` and a `/admins/{uid}` doc.

```bash
cd /path/to/callimachus
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/callimachus/sa.json
export FIREBASE_PROJECT_ID=<your-project-id>
node scripts/bootstrap-admin.mjs <uid> --dry-run   # preview
node scripts/bootstrap-admin.mjs <uid>             # apply
```

The user must sign out + back in for the new claim to take effect.

---

## 8. Deploy

```bash
export FIREBASE_TOKEN=$(firebase login:ci)    # CI token, optional
node scripts/deploy.mjs
```

This validates required env, builds both workspaces, and runs
`firebase deploy --only hosting,functions,firestore:rules,storage`.

CI does the same thing on every push to `main` via
`.github/workflows/ci.yml`.

---

## What this template does NOT include

- A real Firebase project ID, API key, or service-account JSON.
- bKash / Stripe / payment-gateway credentials.
- Seeded production data of any kind.

See `PRIVATE.md` for the full exclusion list and where the originals live.
