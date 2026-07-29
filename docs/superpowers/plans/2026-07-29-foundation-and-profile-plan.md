# Plan 1 — Foundation, Profile, Syllabus (Milestones 1 + 2 + 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vite + React 18 + TypeScript PWA that boots, supports Google sign-in, completes a 3-step onboarding (medium → batch → college), renders the syllabus map with a 4-checkbox grid per chapter, creates + completes manual upcoming tasks, and triggers spaced-repetition auto-scheduling when a chapter's 1st Study is marked done.

**Architecture:** Monorepo at repo root (`apps/web/`, `apps/functions/`, `apps/firestore/`). Vite + React Router 6 with `requireAuth` / `requireProfile` route guards. Firestore holds user-owned syllabus + tasks; Cloud Functions (Gen 2, TypeScript) own server-only writes (user doc creation, SR scheduling, batch status). Vitest for unit, RTL for component, `@firebase/rules-unit-testing` for rules, Playwright for the cross-app e2e in Plan 3.

**Tech Stack (recap from `2026-07-29-README.md`):** TypeScript strict, React 18, Vite, Tailwind + shadcn/ui, Zustand, TanStack Query, react-hook-form + Zod, Vitest + RTL + Playwright, Firebase 10.x (Auth + Firestore + Cloud Functions Gen 2), i18next (initialized at Task 2, English complete + stub Bangla).

**Companion docs:**
- Design spec: `F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md`
- Plan orientation: `F:\Studytracker\docs\superpowers\plans\implementation_plan.md`
- Plan index (tech stack, quality bars): `F:\Studytracker\docs\superpowers\plans\2026-07-29-README.md`
- Handoff (prior session context): `F:\Studytracker\docs\superpowers\plans\HANDOFF.md`

**Working directory for this plan:** `F:\Studytracker\apps\web\` (unless a step says otherwise).

---

## File map (locked at plan start)

| Path | Purpose | Created in |
|---|---|---|
| `apps/web/package.json` | Vite app deps | T1 |
| `apps/web/vite.config.ts` | Vite + Vitest config | T1, T7 |
| `apps/web/tsconfig.json` | TS strict | T1 |
| `apps/web/.env.example` | Public env keys | T1 |
| `apps/web/src/main.tsx` | React entry | T2 |
| `apps/web/src/app/router.tsx` | React Router 6 routes | T2, T10 |
| `apps/web/src/app/ErrorBoundary.tsx` | Top-level error boundary | T2 |
| `apps/web/src/app/Providers.tsx` | QueryClient + i18n + Auth providers | T2, T11 |
| `apps/web/src/lib/firebase/client.ts` | Firebase init (web) | T3 |
| `apps/web/src/lib/firebase/appCheck.ts` | App Check init | T3 |
| `apps/web/src/lib/i18n/index.ts` | i18next init | T4 |
| `apps/web/src/messages/en.json` | English strings (complete) | T4 |
| `apps/web/src/messages/bn.json` | Bangla strings (stub, full in Plan 3) | T4 |
| `apps/web/tailwind.config.ts` | Tailwind + Cool Slate tokens | T5 |
| `apps/web/src/styles/index.css` | Tailwind base + CSS vars | T5 |
| `apps/web/src/components/ui/Button.tsx` | shadcn-style Button | T5 |
| `apps/web/src/features/batches/recomputeBatchStatus.ts` | Pure function | T8 |
| `apps/web/scripts/seedBatches.mjs` | Batch seeder | T9 |
| `apps/web/src/features/auth/AuthContext.tsx` | Auth state context | T10 |
| `apps/web/src/app/guards.tsx` | `requireAuth` + `requireProfile` | T10 |
| `apps/web/src/features/onboarding/Onboarding.tsx` | 3-step form | T11 |
| `apps/functions/src/index.ts` | Cloud Functions entry | T12 |
| `apps/functions/src/onboardingProfile.ts` | Auth onCreate handler | T12 |
| `apps/functions/src/scheduledRevisions.ts` | Firestore write-trigger SR scheduler | T18 |
| `apps/functions/src/recomputeBatchStatus.ts` | Daily cron (also callable) | T14 |
| `firestore.rules` | Security rules | T13 |
| `apps/web/tests/rules/users.test.ts` | Rules unit tests | T13 |
| `apps/web/src/features/syllabus/loadAllSyllabus.ts` | Read all tracked subjects' chapters | T15 |
| `apps/web/src/features/syllabus/nextTypeFor.ts` | Pure | T15 |
| `apps/web/src/features/syllabus/subjectCompletion.ts` | Pure | T15 |
| `apps/web/src/features/syllabus/saveTrackedSubjects.ts` | Write tracked-subjects meta | T15 |
| `apps/web/src/features/syllabus/seedData.bangla.ts` | Physics 1st Paper, ~12 chapters | T16 |
| `apps/web/src/features/syllabus/SyllabusMap.tsx` | UI | T17 |
| `apps/web/src/features/tasks/upcomingTasks.ts` | CRUD | T19 |
| `apps/web/src/features/tasks/useSpacedRepetition.ts` | Hook | T18 |
| `apps/web/src/features/tasks/TasksScreen.tsx` | UI | T20 |
| `.github/workflows/ci.yml` | Lint + test + build + preview | T21 |
| `firebase.json` | Hosting + Functions + Firestore config | T22 |
| `apps/web/public/_redirects` | SPA fallback | T22 |
| `apps/web/playwright.config.ts` | Playwright config | T23 |
| `apps/web/tests/e2e/onboarding.spec.ts` | E2E smoke for this plan | T23 |
| `apps/web/README.md` | Local-dev instructions | T24 |

---

### Task 1: Monorepo skeleton + Vite scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/.env.example`
- Create: `apps/web/.gitignore`
- Create: `apps/web/src/main.tsx` (minimal)
- Create: `apps/web/src/app/ErrorBoundary.tsx`
- Create: `apps/web/src/styles/index.css` (empty placeholder)

- [ ] **Step 1: Create the directory and `package.json`**

```bash
cd F:/Studytracker
mkdir -p apps/web
```

`apps/web/package.json`:
```json
{
  "name": "@hsc-tracker/web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json` (strict)**

`apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: { port: 5173 },
});
```

- [ ] **Step 4: Create `index.html`, `.env.example`, `.gitignore`, minimal `main.tsx`**

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HSC Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_APPCHECK_SITE_KEY=
VITE_SENTRY_DSN=
```

`apps/web/.gitignore`:
```
node_modules
dist
.env
.env.local
coverage
playwright-report
.firebase
```

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import '@/styles/index.css';

function App() {
  return <h1>HSC Tracker</h1>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

`apps/web/src/app/ErrorBoundary.tsx`:
```tsx
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.error) {
      return <div role="alert">Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

`apps/web/src/styles/index.css`:
```css
/* Filled in Task 5 (Tailwind base). Empty for now. */
```

- [ ] **Step 5: Install and verify build**

Run:
```bash
cd F:/Studytracker/apps/web
npm install
npm run build
```
Expected: `dist/` created, no TS errors.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "chore(web): scaffold Vite + React + TS strict"
```

---

### Task 2: React Router 6 + i18n init (English complete, Bangla stub)

**Files:**
- Modify: `apps/web/package.json` (add deps)
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/Providers.tsx`
- Create: `apps/web/src/lib/i18n/index.ts`
- Create: `apps/web/src/messages/en.json`
- Create: `apps/web/src/messages/bn.json`
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/tests/i18n/i18n.test.ts`

- [ ] **Step 1: Add deps**

Run:
```bash
cd F:/Studytracker/apps/web
npm i react-router-dom@^6.26.0 i18next@^23.13.0 react-i18next@^15.0.0 @formatjs/intl@^2.10.0
```

- [ ] **Step 2: Write the failing i18n test**

`apps/web/tests/i18n/i18n.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n', () => {
  it('translates a known key in English', () => {
    expect(t('app.title', { lng: 'en' })).toBe('HSC Tracker');
  });

  it('falls back to English for missing Bangla key with warning', () => {
    // bn.json is a stub; missing keys must return the English fallback,
    // not throw, and must log a warning so we can spot gaps.
    const original = console.warn;
    const warns: string[] = [];
    console.warn = (m) => warns.push(String(m));
    const out = t('app.title', { lng: 'bn' });
    console.warn = original;
    expect(out).toBe('HSC Tracker');
    expect(warns.length).toBeGreaterThan(0);
  });
});
```

Run:
```bash
cd F:/Studytracker/apps/web
npm test -- tests/i18n/i18n.test.ts
```
Expected: FAIL — module `@/lib/i18n` not found.

- [ ] **Step 3: Create `en.json` (the full Plan 1 string set)**

`apps/web/src/messages/en.json`:
```json
{
  "app.title": "HSC Tracker",
  "auth.signInWithGoogle": "Sign in with Google",
  "auth.signOut": "Sign out",
  "onboarding.step1.title": "What's your medium?",
  "onboarding.step1.bangla": "Bangla Medium",
  "onboarding.step1.english": "English Medium",
  "onboarding.step2.title": "Which batch?",
  "onboarding.step3.title": "Your college name?",
  "onboarding.next": "Next",
  "onboarding.back": "Back",
  "onboarding.finish": "Finish",
  "syllabus.title": "Syllabus",
  "syllabus.firstStudy": "1st Study",
  "syllabus.firstRevision": "1st Revision",
  "syllabus.secondRevision": "2nd Revision",
  "syllabus.thirdRevision": "3rd Revision",
  "syllabus.completion": "{pct}% complete",
  "tasks.title": "Tasks",
  "tasks.empty": "No upcoming tasks.",
  "tasks.markDone": "Mark done",
  "tasks.add": "Add task",
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.retry": "Retry",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "guard.requireAuth.redirecting": "Redirecting to sign-in…",
  "guard.requireProfile.redirecting": "Redirecting to onboarding…"
}
```

`apps/web/src/messages/bn.json` (stub — same keys, English values; Plan 3 Task N swaps in Bangla):
```json
{
  "app.title": "HSC Tracker",
  "auth.signInWithGoogle": "Sign in with Google",
  "auth.signOut": "Sign out",
  "onboarding.step1.title": "What's your medium?",
  "onboarding.step1.bangla": "Bangla Medium",
  "onboarding.step1.english": "English Medium",
  "onboarding.step2.title": "Which batch?",
  "onboarding.step3.title": "Your college name?",
  "onboarding.next": "Next",
  "onboarding.back": "Back",
  "onboarding.finish": "Finish",
  "syllabus.title": "Syllabus",
  "syllabus.firstStudy": "1st Study",
  "syllabus.firstRevision": "1st Revision",
  "syllabus.secondRevision": "2nd Revision",
  "syllabus.thirdRevision": "3rd Revision",
  "syllabus.completion": "{pct}% complete",
  "tasks.title": "Tasks",
  "tasks.empty": "No upcoming tasks.",
  "tasks.markDone": "Mark done",
  "tasks.add": "Add task",
  "common.loading": "Loading…",
  "common.error": "Something went wrong.",
  "common.retry": "Retry",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "guard.requireAuth.redirecting": "Redirecting to sign-in…",
  "guard.requireProfile.redirecting": "Redirecting to onboarding…"
}
```

- [ ] **Step 4: Implement i18n init**

`apps/web/src/lib/i18n/index.ts`:
```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, bn: { translation: bn } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    saveMissing: true,
    missingKeyHandler: (_lng, _ns, key) => console.warn(`[i18n] missing ${key}`),
  });
}

export { i18n };
export const t = i18n.t.bind(i18n);
```

- [ ] **Step 5: Run the test — it should pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/i18n/i18n.test.ts
```
Expected: PASS (2 assertions).

- [ ] **Step 6: Create router + providers**

`apps/web/src/app/Providers.tsx`:
```tsx
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

`apps/web/src/app/router.tsx`:
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { t } from '@/lib/i18n';

function Home() {
  return <h1>{t('app.title')}</h1>;
}

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7: Wire `main.tsx` to providers + router**

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Providers } from '@/app/Providers';
import { AppRouter } from '@/app/router';
import '@/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
```

- [ ] **Step 8: Run `npm run build` and verify**

```bash
cd F:/Studytracker/apps/web
npm run build
```
Expected: no TS errors, `dist/index.html` produced.

- [ ] **Step 9: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(web): react router 6 + i18n init with en/bn stubs"
```

---

### Task 3: Firebase client init + App Check

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/firebase/client.ts`
- Create: `apps/web/src/lib/firebase/appCheck.ts`
- Create: `apps/web/tests/firebase/init.test.ts`

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i firebase@^10.13.0
```

- [ ] **Step 2: Write the failing test**

`apps/web/tests/firebase/init.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('firebase client init', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reads config from VITE_FIREBASE_* env vars and exports an app', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');

    const { app } = await import('@/lib/firebase/client');
    expect(app).toBeDefined();
  });
});
```

Run: `npm test -- tests/firebase/init.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement client init**

`apps/web/src/lib/firebase/client.ts`:
```ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

export const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
```

- [ ] **Step 4: Implement App Check init**

`apps/web/src/lib/firebase/appCheck.ts`:
```ts
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { app } from './client';

const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

if (siteKey && typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
```

- [ ] **Step 5: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/firebase/init.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(web): firebase client init + app check scaffold"
```

---

### Task 4: TanStack Query provider

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/app/Providers.tsx`
- Create: `apps/web/tests/providers/QueryClient.test.tsx`

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i @tanstack/react-query@^5.51.0
```

- [ ] **Step 2: Write the failing test**

`apps/web/tests/providers/QueryClient.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { Providers } from '@/app/Providers';

function Probe() {
  const { isLoading } = useQuery({ queryKey: ['x'], queryFn: () => 'ok' });
  return <div>{isLoading ? 'loading' : 'ready'}</div>;
}

describe('Providers', () => {
  it('mounts a QueryClient so children can use queries', () => {
    render(<Providers><Probe /></Providers>);
    expect(screen.getByText(/loading|ready/)).toBeInTheDocument();
  });
});
```

Run: `npm test -- tests/providers/QueryClient.test.tsx` → FAIL.

- [ ] **Step 3: Add `QueryClientProvider`**

`apps/web/src/app/Providers.tsx`:
```tsx
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}
```

- [ ] **Step 4: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/providers/QueryClient.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(web): tanstack query provider"
```

---

### Task 5: Tailwind + Cool Slate palette + Button

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Modify: `apps/web/src/styles/index.css`
- Create: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/tests/components/Button.test.tsx`

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i -D tailwindcss@^3.4.10 postcss@^8.4.41 autoprefixer@^10.4.20
npm i clsx@^2.1.1
```

- [ ] **Step 2: Write the failing Button test**

`apps/web/tests/components/Button.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the label and uses bg-primary for variant=primary', () => {
    render(<Button variant="primary">Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toMatch(/bg-primary/);
  });
});
```

Run: `npm test -- tests/components/Button.test.tsx` → FAIL.

- [ ] **Step 3: Configure Tailwind with Cool Slate tokens**

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        bn: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

`apps/web/postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`apps/web/src/styles/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #F4F1EC;
  --surface: #FFFFFF;
  --surface-2: #ECE7DE;
  --text: #1B2A41;
  --text-dim: #5C6B7E;
  --primary: #2E5A88;
  --accent: #E0A458;
  --success: #3F6B4E;
  --warning: #C97B5A;
  --danger: #B33A3A;
}

html.dark {
  --bg: #0F1620;
  --surface: #172030;
  --surface-2: #1E293B;
  --text: #E6EAF0;
  --text-dim: #94A3B8;
  --primary: #6B9BD1;
  --accent: #E0A458;
  --success: #7FB48E;
  --warning: #D69472;
  --danger: #E16A6A;
}
```

- [ ] **Step 4: Implement `Button`**

`apps/web/src/components/ui/Button.tsx`:
```tsx
import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:opacity-90',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
};

export function Button({ variant = 'primary', className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        'focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50',
        variantClass[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/components/Button.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(web): tailwind + cool slate palette + Button component"
```

---

### Task 6: ESLint + Prettier + Husky + lint-staged

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/.eslintrc.cjs`
- Create: `apps/web/.prettierrc.json`
- Create: `apps/web/.lintstagedrc.json`
- Create: `apps/web/.husky/pre-commit`

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i -D eslint@^8.57.0 @typescript-eslint/parser@^7.18.0 @typescript-eslint/eslint-plugin@^7.18.0 eslint-plugin-react-hooks@^4.6.2 eslint-plugin-react-refresh@^0.4.9 prettier@^3.3.3 husky@^9.1.4 lint-staged@^15.2.7
```

- [ ] **Step 2: ESLint config**

`apps/web/.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
};
```

- [ ] **Step 3: Prettier + lint-staged + Husky config**

`apps/web/.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100 }
```

`apps/web/.lintstagedrc.json`:
```json
{ "*.{ts,tsx}": ["eslint --fix", "prettier --write"], "*.{json,md,css}": ["prettier --write"] }
```

`apps/web/.husky/pre-commit`:
```sh
#!/usr/bin/env sh
npx --no-install lint-staged
```

- [ ] **Step 4: Activate Husky and add npm scripts**

Modify `apps/web/package.json` (add to `scripts`):
```json
"scripts": {
  "...": "...",
  "lint": "eslint .",
  "format": "prettier --write .",
  "prepare": "husky install"
}
```

Run:
```bash
cd F:/Studytracker/apps/web
npm run prepare
chmod +x .husky/pre-commit
npm run lint
```
Expected: no errors. (No code to lint yet, so the run is a no-op.)

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "chore(web): eslint + prettier + husky + lint-staged"
```

---

### Task 7: Vitest + RTL + jsdom + path alias

**Files:**
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/tests/setup.ts`
- Create: `apps/web/tests/sanity.test.ts`

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i -D @testing-library/react@^16.0.0 @testing-library/dom@^10.4.0 @testing-library/jest-dom@^6.4.8 jsdom@^25.0.0
```

- [ ] **Step 2: Update `vite.config.ts` with test block**

`apps/web/vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Create setup file**

`apps/web/tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Sanity test**

`apps/web/tests/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest+RTL sanity', () => {
  it('renders a div via RTL', () => {
    render(<div data-testid="x">hi</div>);
    expect(screen.getByTestId('x')).toHaveTextContent('hi');
  });
});
```

Run:
```bash
cd F:/Studytracker/apps/web
npm test -- tests/sanity.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "test(web): vitest + RTL + jsdom with path alias"
```

---

### Task 8: `recomputeBatchStatus` pure function (M2 core)

**Files:**
- Create: `apps/web/src/features/batches/recomputeBatchStatus.ts`
- Create: `apps/web/tests/features/batches/recomputeBatchStatus.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/tests/features/batches/recomputeBatchStatus.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { recomputeBatchStatus, type BatchDates } from '@/features/batches/recomputeBatchStatus';

const baseBatch: BatchDates = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('recomputeBatchStatus', () => {
  it('is "pre-start" before collegeStart', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2025-01-01T00:00:00+06:00'))).toBe('pre-start');
  });

  it('is "in-session" between collegeStart and examStart', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2025-12-01T00:00:00+06:00'))).toBe('in-session');
  });

  it('is "exam-window" between examStart and examEnd (inclusive)', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2026-07-15T00:00:00+06:00'))).toBe('exam-window');
    expect(recomputeBatchStatus(baseBatch, new Date('2026-08-15T00:00:00+06:00'))).toBe('exam-window');
  });

  it('is "resulted" after examEnd', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2026-09-01T00:00:00+06:00'))).toBe('resulted');
  });
});
```

Run: `npm test -- tests/features/batches/recomputeBatchStatus.test.ts` → FAIL.

- [ ] **Step 2: Implement**

`apps/web/src/features/batches/recomputeBatchStatus.ts`:
```ts
export type BatchStatus = 'pre-start' | 'in-session' | 'exam-window' | 'resulted';

export type BatchDates = {
  collegeStart: Date;
  examStart: Date;
  examEnd: Date;
};

export function recomputeBatchStatus(batch: BatchDates, now: Date): BatchStatus {
  if (now < batch.collegeStart) return 'pre-start';
  if (now < batch.examStart) return 'in-session';
  if (now <= batch.examEnd) return 'exam-window';
  return 'resulted';
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/batches/recomputeBatchStatus.test.ts
```
Expected: 4/4 PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(batches): recomputeBatchStatus pure with tests"
```

---

### Task 9: Batch seed script (HSC-2024 … HSC-2030) + verification gate

**Files:**
- Create: `apps/web/scripts/seedBatches.mjs`
- Create: `apps/web/scripts/verifyBatchDates.mjs`
- Create: `apps/web/tests/features/batches/seedBatches.shape.test.ts`
- Modify: `apps/web/package.json` (add `seed:batches`, `verify:batch-dates`)

- [ ] **Step 1: Write failing shape test**

`apps/web/tests/features/batches/seedBatches.shape.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { BATCH_SEED } from '@/features/batches/seedData';

describe('BATCH_SEED shape', () => {
  it('contains exactly HSC-2024 through HSC-2030', () => {
    const ids = BATCH_SEED.map((b) => b.id).sort();
    expect(ids).toEqual([
      'HSC-2024', 'HSC-2025', 'HSC-2026', 'HSC-2027',
      'HSC-2028', 'HSC-2029', 'HSC-2030',
    ]);
  });

  it('every batch has collegeStart < examStart < examEnd', () => {
    for (const b of BATCH_SEED) {
      expect(b.collegeStart.getTime()).toBeLessThan(b.examStart.getTime());
      expect(b.examStart.getTime()).toBeLessThan(b.examEnd.getTime());
    }
  });
});
```

- [ ] **Step 2: Create `seedData.ts`**

`apps/web/src/features/batches/seedData.ts`:
```ts
import type { BatchDates } from './recomputeBatchStatus';

export type BatchSeed = BatchDates & {
  id: string;
  label: string;
  resultDate: Date;
  medium: 'bangla' | 'english' | 'both';
  isPublic: boolean;
};

/**
 * PLACEHOLDER dates. Admin must verify against Bangladesh Education Board
 * schedule before public launch. See design spec §9.4.
 */
export const BATCH_SEED: BatchSeed[] = [
  { id: 'HSC-2024', label: 'HSC 2024', collegeStart: new Date('2023-07-15T00:00:00+06:00'), examStart: new Date('2024-06-30T00:00:00+06:00'), examEnd: new Date('2024-08-15T00:00:00+06:00'), resultDate: new Date('2024-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2025', label: 'HSC 2025', collegeStart: new Date('2024-07-15T00:00:00+06:00'), examStart: new Date('2025-06-30T00:00:00+06:00'), examEnd: new Date('2025-08-15T00:00:00+06:00'), resultDate: new Date('2025-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2026', label: 'HSC 2026', collegeStart: new Date('2025-07-15T00:00:00+06:00'), examStart: new Date('2026-06-30T00:00:00+06:00'), examEnd: new Date('2026-08-15T00:00:00+06:00'), resultDate: new Date('2026-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2027', label: 'HSC 2027', collegeStart: new Date('2026-07-15T00:00:00+06:00'), examStart: new Date('2027-06-30T00:00:00+06:00'), examEnd: new Date('2027-08-15T00:00:00+06:00'), resultDate: new Date('2027-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2028', label: 'HSC 2028', collegeStart: new Date('2027-07-15T00:00:00+06:00'), examStart: new Date('2028-06-30T00:00:00+06:00'), examEnd: new Date('2028-08-15T00:00:00+06:00'), resultDate: new Date('2028-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2029', label: 'HSC 2029', collegeStart: new Date('2028-07-15T00:00:00+06:00'), examStart: new Date('2029-06-30T00:00:00+06:00'), examEnd: new Date('2029-08-15T00:00:00+06:00'), resultDate: new Date('2029-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
  { id: 'HSC-2030', label: 'HSC 2030', collegeStart: new Date('2029-07-15T00:00:00+06:00'), examStart: new Date('2030-06-30T00:00:00+06:00'), examEnd: new Date('2030-08-15T00:00:00+06:00'), resultDate: new Date('2030-10-15T00:00:00+06:00'), medium: 'both', isPublic: true },
];
```

Run: `npm test -- tests/features/batches/seedBatches.shape.test.ts` → PASS.

- [ ] **Step 3: Seeder script**

`apps/web/scripts/seedBatches.mjs`:
```js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { BATCH_SEED } from '../src/features/batches/seedData.ts';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(config);
const db = getFirestore(app);

for (const b of BATCH_SEED) {
  await setDoc(doc(db, 'batches', b.id), {
    label: b.label,
    collegeStart: Timestamp.fromDate(b.collegeStart),
    examStart: Timestamp.fromDate(b.examStart),
    examEnd: Timestamp.fromDate(b.examEnd),
    resultDate: Timestamp.fromDate(b.resultDate),
    medium: b.medium,
    isPublic: b.isPublic,
    status: 'pre-start', // recomputeBatchStatus cron will fix
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log(`Seeded ${b.id}`);
}
```

`apps/web/scripts/verifyBatchDates.mjs`:
```js
// Prints a checklist for the admin to confirm against Bangladesh Education Board.
import { BATCH_SEED } from '../src/features/batches/seedData.ts';
console.log('VERIFY THESE DATES against https://www.educationboard.gov.bd/');
for (const b of BATCH_SEED) {
  console.log(`${b.id}: college=${b.collegeStart.toISOString().slice(0,10)} exam=${b.examStart.toISOString().slice(0,10)}–${b.examEnd.toISOString().slice(0,10)} result=${b.resultDate.toISOString().slice(0,10)}`);
}
```

Modify `apps/web/package.json` `scripts`:
```json
"seed:batches": "node --import tsx scripts/seedBatches.mjs",
"verify:batch-dates": "node --import tsx scripts/verifyBatchDates.mjs"
```

Add `tsx` dev dep:
```bash
cd F:/Studytracker/apps/web
npm i -D tsx@^4.19.0
```

Run (dry — no real project yet, just shape):
```bash
cd F:/Studytracker/apps/web
npm run verify:batch-dates
```
Expected: prints 7 lines, one per batch.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(batches): seedData + seeder + verification script"
```

---

### Task 10: Firebase Functions Gen 2 scaffold + `onboardingProfile`

**Files:**
- Create: `apps/functions/package.json`
- Create: `apps/functions/tsconfig.json`
- Create: `apps/functions/src/index.ts`
- Create: `apps/functions/src/onboardingProfile.ts`
- Create: `apps/functions/tests/onboardingProfile.test.ts`

- [ ] **Step 1: Create Functions `package.json`**

`apps/functions/package.json`:
```json
{
  "name": "@hsc-tracker/functions",
  "private": true,
  "type": "module",
  "main": "lib/index.js",
  "engines": { "node": "20" },
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions,firestore",
    "deploy": "firebase deploy --only functions",
    "test": "vitest run"
  },
  "dependencies": {
    "firebase-admin": "^12.4.0",
    "firebase-functions": "^5.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

`apps/functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "lib",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 2: Write failing test for `onboardingProfile`**

`apps/functions/tests/onboardingProfile.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

// We mock firebase-admin BEFORE importing the function under test.
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({
    doc: (_p: string) => ({
      set: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

import { onboardingProfile } from '../src/onboardingProfile';

describe('onboardingProfile', () => {
  it('creates a user doc with trialEnd = now + 7 days', async () => {
    const set = vi.fn();
    const auth = { uid: 'u123', token: { email: 'a@b.c' } };
    const before = Date.now();
    // Re-import the module after mock is set.
    const mod = await import('../src/onboardingProfile?fresh');
    await mod.onboardingProfile({} as never, { auth } as never, {
      firestore: { doc: () => ({ set }) },
    } as never);
    const payload = set.mock.calls[0]?.[0] as { trialEnd: { toMillis: () => number } };
    expect(payload.trialEnd.toMillis()).toBeGreaterThanOrEqual(before + 7 * 86400_000 - 1000);
  });
});
```

- [ ] **Step 3: Implement `onboardingProfile`**

`apps/functions/src/onboardingProfile.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp();

const TRIAL_DAYS = 7;

export const onboardingProfile = onCall<{
  displayName?: string;
  college?: string;
  batchId?: string;
  medium?: 'bangla' | 'english';
}>(async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const { uid } = request.auth;
  const db = getFirestore();
  const data = request.data;

  if (!data.batchId || !data.medium) {
    throw new HttpsError('invalid-argument', 'batchId and medium are required');
  }

  await db.doc(`users/${uid}`).set(
    {
      uid,
      displayName: data.displayName ?? request.auth.token.name ?? '',
      email: request.auth.token.email ?? '',
      photoURL: request.auth.token.picture ?? null,
      college: data.college ?? '',
      batchId: data.batchId,
      medium: data.medium,
      timezone: 'Asia/Dhaka',
      trialEnd: Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 86400_000),
      subscription: { status: 'trial', plan: null, expiresAt: null, paymentRequestId: null },
      batchHistory: [data.batchId],
      fcmTokens: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  return { ok: true };
});
```

- [ ] **Step 4: Export from index**

`apps/functions/src/index.ts`:
```ts
export { onboardingProfile } from './onboardingProfile.js';
```

- [ ] **Step 5: Build to verify TS compiles**

```bash
cd F:/Studytracker/apps/functions
npm install
npm run build
```
Expected: `lib/index.js` produced.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/functions
git commit -m "feat(functions): gen2 scaffold + onboardingProfile"
```

---

### Task 11: Firestore rules skeleton + users rules test

**Files:**
- Create: `firestore.rules`
- Create: `apps/web/tests/rules/users.test.ts`
- Modify: `apps/web/package.json` (add `@firebase/rules-unit-testing`)

- [ ] **Step 1: Add deps**

```bash
cd F:/Studytracker/apps/web
npm i -D @firebase/rules-unit-testing@^3.0.4 @firebase/rules@^3.0.0 firebase@^10.13.0
```

- [ ] **Step 2: Write failing rules test (1 of 4 — positive create)**

`apps/web/tests/rules/users.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

describe('users/{uid} rules', () => {
  it('allows the owner to create their own doc with whitelisted fields', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u1'), {
        displayName: 'A', email: 'a@b.c', photoURL: null, college: 'X',
        batchId: 'HSC-2026', medium: 'bangla',
      }),
    );
  });

  it('forbids the owner writing trialEnd', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u2'), {
        displayName: 'A', batchId: 'HSC-2026', medium: 'bangla',
        trialEnd: new Date(),
      }),
    );
  });

  it('forbids other users reading your user doc', async () => {
    const ctx = env.authenticatedContext('u3');
    await assertFails(getDoc(doc(ctx.firestore(), 'users/u4')));
  });

  it('forbids clients from writing sessions/{sid}', async () => {
    const ctx = env.authenticatedContext('u5');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u5/sessions/s1'), { durationSec: 60 }),
    );
  });
});
```

- [ ] **Step 3: Implement rules covering these cases**

`firestore.rules`:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isSelf(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }
    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    function onlyProfileFields() {
      return request.resource.data.diff(resource.data).affectedKeys()
                .hasOnly(['displayName','email','photoURL','college','batchId','medium','updatedAt']);
    }

    match /users/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid)
                    && request.resource.data.diff({}).affectedKeys()
                        .hasOnly(['displayName','email','photoURL','college','batchId','medium','timezone']);
      allow update: if isSelf(uid) && onlyProfileFields();

      match /sessions/{sid}  { allow read, write: if false; }
      match /syllabus/{x}    { allow read, write: if isSelf(uid); }
      match /upcomingTasks/{x}{ allow read, write: if isSelf(uid); }
      match /meta/{x}        { allow read, write: if isSelf(uid); }
    }

    match /paymentRequests/{id} {
      allow read: if isSignedIn() && resource.data.uid == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    match /analytics/{x}  { allow read: if isSignedIn(); allow write: if false; }
    match /admins/{uid}   { allow read: if isSignedIn(); allow write: if false; }
    match /batches/{x}    { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /syllabus/{x}   { allow read: if isSignedIn(); allow write: if false; }
    match /audit/{id}     { allow read: if isAdmin(); allow write: if false; }
  }
}
```

- [ ] **Step 4: Run rules test**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/rules/users.test.ts
```
Expected: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add firestore.rules apps/web
git commit -m "feat(rules): users/syllabus/tasks/analytics/admin rules + tests"
```

---

### Task 12: AuthContext + requireAuth/requireProfile guards + Google sign-in

**Files:**
- Create: `apps/web/src/features/auth/AuthContext.tsx`
- Create: `apps/web/src/features/auth/useGoogleSignIn.ts`
- Create: `apps/web/src/app/guards.tsx`
- Create: `apps/web/src/features/auth/SignInScreen.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/app/Providers.tsx`
- Create: `apps/web/tests/features/auth/AuthContext.test.tsx`

- [ ] **Step 1: Write failing test for AuthContext**

`apps/web/tests/features/auth/AuthContext.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (_a: unknown, cb: (u: unknown) => void) => {
    cb({ uid: 'u1', email: 'a@b.c', displayName: 'A' });
    return () => {};
  },
  GoogleAuthProvider: class { addScope() { return this; } },
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'u1' } }),
  signOut: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';

function Probe() {
  const { user } = useAuth();
  return <div>{user ? user.uid : 'anon'}</div>;
}

describe('AuthContext', () => {
  it('exposes the current user', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('u1')).toBeInTheDocument());
  });
});
```

Run: `npm test -- tests/features/auth/AuthContext.test.tsx` → FAIL.

- [ ] **Step 2: Implement `AuthContext`**

`apps/web/src/features/auth/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { app } from '@/lib/firebase/client';

type AuthState = { user: User | null; loading: boolean };
const Ctx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useMemo(() => getAuth(app), []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, [auth]);

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
```

- [ ] **Step 3: Implement Google sign-in**

`apps/web/src/features/auth/useGoogleSignIn.ts`:
```ts
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { app } from '@/lib/firebase/client';

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  return signInWithPopup(getAuth(app), provider);
}
```

- [ ] **Step 4: Sign-in screen**

`apps/web/src/features/auth/SignInScreen.tsx`:
```tsx
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle } from './useGoogleSignIn';

export function SignInScreen() {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-screen place-items-center bg-bg">
      <Button variant="primary" onClick={() => signInWithGoogle()}>
        {t('auth.signInWithGoogle')}
      </Button>
    </main>
  );
}
```

- [ ] **Step 5: Route guards**

`apps/web/src/app/guards.tsx`:
```tsx
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/profile/useProfile';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" state={{ from: loc }} replace />;
  return <>{children}</>;
}

export function RequireProfile({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.uid);
  if (loading) return null;
  if (!profile?.batchId) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Update router with guards**

`apps/web/src/app/router.tsx`:
```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Providers } from './Providers';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/features/home/Home';
import { RequireAuth, RequireProfile } from './guards';

const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInScreen /> },
  {
    path: '/',
    element: <RequireAuth><RequireProfile><Home /></RequireProfile></RequireAuth>,
  },
  { path: '/onboarding', element: <RequireAuth><Onboarding /></RequireAuth> },
]);

export function AppRouter() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
```

- [ ] **Step 7: Minimal `Home` + `useProfile` (used by guards)**

`apps/web/src/features/home/Home.tsx`:
```tsx
import { useTranslation } from 'react-i18next';

export function Home() {
  const { t } = useTranslation();
  return <h1 className="p-4 text-text">{t('app.title')}</h1>;
}
```

`apps/web/src/features/profile/useProfile.ts`:
```ts
import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type Profile = {
  displayName: string;
  email: string;
  college: string;
  batchId: string | null;
  medium: 'bangla' | 'english' | null;
};

export function useProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid) { setLoading(false); return; }
      const snap = await getDoc(doc(getFirestore(app), `users/${uid}`));
      if (!active) return;
      setProfile(snap.exists() ? (snap.data() as Profile) : null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [uid]);

  return { profile, loading };
}
```

- [ ] **Step 8: Add `<Onboarding>` placeholder (real one in Task 11)**

`apps/web/src/features/onboarding/Onboarding.tsx`:
```tsx
import { useTranslation } from 'react-i18next';

export function Onboarding() {
  const { t } = useTranslation();
  return <p className="p-4 text-text">{t('onboarding.step1.title')}</p>;
}
```

- [ ] **Step 9: Run test + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/auth/AuthContext.test.tsx
npm run build
```
Expected: PASS, build succeeds.

- [ ] **Step 10: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(auth): AuthContext + requireAuth/requireProfile + Google sign-in"
```

---

### Task 13: 3-step Onboarding form (medium → batch → college)

**Files:**
- Modify: `apps/web/src/features/onboarding/Onboarding.tsx`
- Create: `apps/web/src/features/onboarding/OnboardingForm.tsx`
- Create: `apps/web/tests/features/onboarding/OnboardingForm.test.tsx`

- [ ] **Step 1: Write failing test**

`apps/web/tests/features/onboarding/OnboardingForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_a: unknown, name: string) => async (data: unknown) => {
    if (name === 'onboardingProfile') return { data: { ok: true, payload: data } };
    return { data: { ok: true, payload: data } };
  },
  connectFunctionsEmulator: () => undefined,
}));

import { OnboardingForm } from '@/features/onboarding/OnboardingForm';

describe('OnboardingForm', () => {
  it('submits medium + batch + college to onboardingProfile', async () => {
    const onDone = vi.fn();
    render(<OnboardingForm uid="u1" onDone={onDone} />);

    fireEvent.click(screen.getByLabelText(/Bangla Medium/i));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    fireEvent.click(screen.getByLabelText(/HSC 2026/i));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    fireEvent.change(screen.getByLabelText(/college/i), { target: { value: 'Dhaka College' } });
    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith({
      displayName: '',
      college: 'Dhaka College',
      batchId: 'HSC-2026',
      medium: 'bangla',
    }));
  });
});
```

- [ ] **Step 2: Add `react-hook-form` + `zod`**

```bash
cd F:/Studytracker/apps/web
npm i react-hook-form@^7.52.0 zod@^3.23.8 @hookform/resolvers@^3.9.0
```

- [ ] **Step 3: Implement `OnboardingForm`**

`apps/web/src/features/onboarding/OnboardingForm.tsx`:
```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { Button } from '@/components/ui/Button';
import { BATCH_SEED } from '@/features/batches/seedData';

const Schema = z.object({
  medium: z.enum(['bangla', 'english']),
  batchId: z.string().min(1),
  college: z.string().min(1).max(80),
});
type FormData = z.infer<typeof Schema>;

export function OnboardingForm({ uid, onDone }: { uid: string; onDone: (v: FormData) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(Schema), defaultValues: { medium: 'bangla', batchId: 'HSC-2026', college: '' } });

  const submit = handleSubmit(async (data) => {
    const fn = httpsCallable<FormData, { ok: boolean }>(getFunctions(app), 'onboardingProfile');
    await fn({ ...data, displayName: '' });
    onDone(data);
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-4 text-text">
      {step === 0 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step1.title')}</legend>
          <label className="block"><input type="radio" value="bangla" {...register('medium')} /> {t('onboarding.step1.bangla')}</label>
          <label className="block"><input type="radio" value="english" {...register('medium')} /> {t('onboarding.step1.english')}</label>
          <Button type="button" onClick={() => setStep(1)}>{t('onboarding.next')}</Button>
        </fieldset>
      )}
      {step === 1 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step2.title')}</legend>
          <select {...register('batchId')} className="rounded border p-2">
            {BATCH_SEED.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>{t('onboarding.back')}</Button>
            <Button type="button" onClick={() => setStep(2)}>{t('onboarding.next')}</Button>
          </div>
        </fieldset>
      )}
      {step === 2 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step3.title')}</legend>
          <input aria-label="college" {...register('college')} className="rounded border p-2 w-full" />
          {errors.college && <p className="text-danger">{errors.college.message}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>{t('onboarding.back')}</Button>
            <Button type="submit">{t('onboarding.finish')}</Button>
          </div>
        </fieldset>
      )}
      <p className="text-text-dim">uid: {uid}</p>
    </form>
  );
}
```

`apps/web/src/features/onboarding/Onboarding.tsx`:
```tsx
import { useAuth } from '@/features/auth/AuthContext';
import { OnboardingForm } from './OnboardingForm';
import { useNavigate } from 'react-router-dom';

export function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  return (
    <OnboardingForm
      uid={user.uid}
      onDone={() => nav('/', { replace: true })}
    />
  );
}
```

- [ ] **Step 4: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/onboarding/OnboardingForm.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(onboarding): 3-step medium→batch→college form with zod"
```

---

### Task 14: `recomputeBatchStatus` Cloud Function (callable + cron)

**Files:**
- Create: `apps/functions/src/recomputeBatchStatus.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/functions/tests/recomputeBatchStatus.test.ts`

- [ ] **Step 1: Write failing test (unit on the status map)**

`apps/functions/tests/recomputeBatchStatus.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { recomputeBatchStatus, type BatchDates } from '../src/recomputeBatchStatus';

const b: BatchDates = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('functions:recomputeBatchStatus', () => {
  it('maps the four windows correctly', () => {
    expect(recomputeBatchStatus(b, new Date('2025-01-01T00:00:00+06:00'))).toBe('pre-start');
    expect(recomputeBatchStatus(b, new Date('2025-12-01T00:00:00+06:00'))).toBe('in-session');
    expect(recomputeBatchStatus(b, new Date('2026-07-15T00:00:00+06:00'))).toBe('exam-window');
    expect(recomputeBatchStatus(b, new Date('2026-09-01T00:00:00+06:00'))).toBe('resulted');
  });
});
```

- [ ] **Step 2: Implement shared logic + scheduled function**

`apps/functions/src/recomputeBatchStatus.ts`:
```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp();

export type BatchDates = {
  collegeStart: Date;
  examStart: Date;
  examEnd: Date;
};

export function recomputeBatchStatus(b: BatchDates, now: Date) {
  if (now < b.collegeStart) return 'pre-start';
  if (now < b.examStart) return 'in-session';
  if (now <= b.examEnd) return 'exam-window';
  return 'resulted';
}

async function recomputeAllBatches() {
  const db = getFirestore();
  const snap = await db.collection('batches').get();
  const now = new Date();
  const writes: Promise<unknown>[] = [];
  for (const d of snap.docs) {
    const data = d.data() as { collegeStart: Timestamp; examStart: Timestamp; examEnd: Timestamp };
    const next = recomputeBatchStatus(
      { collegeStart: data.collegeStart.toDate(), examStart: data.examStart.toDate(), examEnd: data.examEnd.toDate() },
      now,
    );
    if (data.status !== next) writes.push(d.ref.update({ status: next, updatedAt: Timestamp.now() }));
  }
  await Promise.all(writes);
  return { updated: writes.length };
}

export const recomputeBatchStatusCron = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Asia/Dhaka' },
  recomputeAllBatches,
);

export const recomputeBatchStatusCallable = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  // Optional: enforce admin
  return recomputeAllBatches();
});
```

`apps/functions/src/index.ts`:
```ts
export { onboardingProfile } from './onboardingProfile.js';
export { recomputeBatchStatusCron, recomputeBatchStatusCallable } from './recomputeBatchStatus.js';
```

- [ ] **Step 3: Run test + build**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/recomputeBatchStatus.test.ts
npm run build
```
Expected: PASS, `lib/` produced.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/functions
git commit -m "feat(functions): recomputeBatchStatus (cron + callable)"
```

---

### Task 15: Syllabus data layer (loadAll / nextTypeFor / subjectCompletion / saveTrackedSubjects)

**Files:**
- Create: `apps/web/src/features/syllabus/loadAllSyllabus.ts`
- Create: `apps/web/src/features/syllabus/nextTypeFor.ts`
- Create: `apps/web/src/features/syllabus/subjectCompletion.ts`
- Create: `apps/web/src/features/syllabus/saveTrackedSubjects.ts`
- Create: `apps/web/src/features/syllabus/types.ts`
- Create: `apps/web/tests/features/syllabus/nextTypeFor.test.ts`
- Create: `apps/web/tests/features/syllabus/subjectCompletion.test.ts`

- [ ] **Step 1: Write failing tests for the two pure functions**

`apps/web/tests/features/syllabus/nextTypeFor.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nextTypeFor } from '@/features/syllabus/nextTypeFor';

const ch = (over: Partial<{ firstStudy: boolean; firstRevision: boolean; secondRevision: boolean; thirdRevision: boolean }> = {}) => ({
  firstStudy: false, firstRevision: false, secondRevision: false, thirdRevision: false, ...over,
});

describe('nextTypeFor', () => {
  it('returns firstStudy when nothing is done', () => {
    expect(nextTypeFor(ch())).toBe('firstStudy');
  });
  it('returns firstRevision after firstStudy', () => {
    expect(nextTypeFor(ch({ firstStudy: true }))).toBe('firstRevision');
  });
  it('returns secondRevision after firstRevision', () => {
    expect(nextTypeFor(ch({ firstStudy: true, firstRevision: true }))).toBe('secondRevision');
  });
  it('returns thirdRevision after secondRevision', () => {
    expect(nextTypeFor(ch({ firstStudy: true, firstRevision: true, secondRevision: true }))).toBe('thirdRevision');
  });
  it('returns null after thirdRevision', () => {
    expect(nextTypeFor(ch({ firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true }))).toBeNull();
  });
});
```

`apps/web/tests/features/syllabus/subjectCompletion.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { subjectCompletion } from '@/features/syllabus/subjectCompletion';

describe('subjectCompletion', () => {
  it('returns 0% for empty chapters', () => {
    expect(subjectCompletion({})).toEqual({ firstStudy: 0, firstRevision: 0, secondRevision: 0, thirdRevision: 0 });
  });
  it('returns 100% for fully completed chapters', () => {
    const chapters = {
      c1: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
      c2: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
    };
    expect(subjectCompletion(chapters)).toEqual({ firstStudy: 100, firstRevision: 100, secondRevision: 100, thirdRevision: 100 });
  });
  it('returns 50% for half-completed chapters (per stage)', () => {
    const chapters = {
      c1: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
      c2: { firstStudy: true, firstRevision: false, secondRevision: false, thirdRevision: false },
    };
    expect(subjectCompletion(chapters)).toEqual({ firstStudy: 100, firstRevision: 50, secondRevision: 50, thirdRevision: 50 });
  });
});
```

- [ ] **Step 2: Implement the four modules**

`apps/web/src/features/syllabus/types.ts`:
```ts
export type ChapterState = {
  firstStudy: boolean;
  firstStudyDate?: Date | null;
  firstRevision: boolean;
  firstRevisionDate?: Date | null;
  secondRevision: boolean;
  secondRevisionDate?: Date | null;
  thirdRevision: boolean;
  thirdRevisionDate?: Date | null;
};

export type ChapterKey = string;
export type ChaptersMap = Record<ChapterKey, ChapterState>;

export type SubjectDoc = {
  subjectId: string;
  subjectName: string;
  chapters: { id: string; name: string; tags?: string[] }[];
};
```

`apps/web/src/features/syllabus/nextTypeFor.ts`:
```ts
import type { ChapterState } from './types';

export type Stage = 'firstStudy' | 'firstRevision' | 'secondRevision' | 'thirdRevision';
const ORDER: Stage[] = ['firstStudy', 'firstRevision', 'secondRevision', 'thirdRevision'];

export function nextTypeFor(chapter: ChapterState): Stage | null {
  for (const s of ORDER) if (!chapter[s]) return s;
  return null;
}
```

`apps/web/src/features/syllabus/subjectCompletion.ts`:
```ts
import type { ChaptersMap, ChapterKey } from './types';

export function subjectCompletion(chapters: ChaptersMap) {
  const keys = Object.keys(chapters) as ChapterKey[];
  const total = keys.length || 1;
  const count = (k: keyof ChaptersMap[string]) =>
    keys.reduce((n, c) => n + (chapters[c]?.[k] ? 1 : 0), 0);
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    firstStudy: pct(count('firstStudy')),
    firstRevision: pct(count('firstRevision')),
    secondRevision: pct(count('secondRevision')),
    thirdRevision: pct(count('thirdRevision')),
  };
}
```

`apps/web/src/features/syllabus/loadAllSyllabus.ts`:
```ts
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { ChaptersMap, SubjectDoc } from './types';

export type SyllabusLoad = {
  subjects: SubjectDoc[];
  chapters: Record<string /* subjectId */, ChaptersMap>;
};

/** Loads all `/syllabus/{board}/{medium}/{subjectId}` docs and the user's per-subject progress. */
export async function loadAllSyllabus(uid: string, medium: 'bangla' | 'english'): Promise<SyllabusLoad> {
  const db = getFirestore(app);
  const subjectsSnap = await getDocs(collection(db, `syllabus/board/${medium}`));
  const subjects = subjectsSnap.docs.map((d) => ({ subjectId: d.id, ...(d.data() as Omit<SubjectDoc, 'subjectId'>) }));

  const chapters: Record<string, ChaptersMap> = {};
  for (const s of subjects) {
    const userSyll = await getDoc(doc(db, `users/${uid}/syllabus/${s.subjectId}`));
    chapters[s.subjectId] = userSyll.exists() ? (userSyll.data() as ChaptersMap) : {};
  }
  return { subjects, chapters };
}
```

`apps/web/src/features/syllabus/saveTrackedSubjects.ts`:
```ts
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export async function saveTrackedSubjects(uid: string, subjectIds: string[]) {
  const db = getFirestore(app);
  await setDoc(doc(db, `users/${uid}/meta/trackedSubjects`), {
    subjectIds, updatedAt: Timestamp.now(),
  });
}
```

- [ ] **Step 3: Run tests — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/syllabus
```
Expected: 2 test files PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(syllabus): data layer (loadAll / nextTypeFor / completion / saveTracked)"
```

---

### Task 16: Seed syllabus data — Physics 1st Paper (Bangla medium) worked example

**Files:**
- Create: `apps/web/src/features/syllabus/seedData.bangla.ts`
- Create: `apps/web/tests/features/syllabus/seedData.shape.test.ts`
- Create: `apps/web/scripts/seedSyllabus.mjs`

- [ ] **Step 1: Shape test**

`apps/web/tests/features/syllabus/seedData.shape.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SUBJECT_SEED } from '@/features/syllabus/seedData.bangla';

describe('SUBJECT_SEED (Bangla medium)', () => {
  it('includes physics1', () => {
    const p1 = SUBJECT_SEED.find((s) => s.subjectId === 'physics1');
    expect(p1).toBeDefined();
    expect(p1!.chapters.length).toBeGreaterThanOrEqual(8);
    expect(p1!.chapters.length).toBeLessThanOrEqual(20);
  });
  it('chapter ids are unique', () => {
    for (const s of SUBJECT_SEED) {
      const ids = s.chapters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
```

- [ ] **Step 2: Seed file (worked example, real NCTB structure)**

`apps/web/src/features/syllabus/seedData.bangla.ts`:
```ts
import type { SubjectDoc } from './types';

/**
 * PLACEHOLDER Bangla-medium syllabus seed.
 * Plan 1 ships this one subject (Physics 1st Paper) as a worked example.
 * Remaining 12 subjects are added in a single follow-up task that mirrors
 * this shape. We re-type, we do not scrape.
 */
export const SUBJECT_SEED: SubjectDoc[] = [
  {
    subjectId: 'physics1',
    subjectName: 'পদার্থবিজ্ঞান ১ম পত্র',
    chapters: [
      { id: 'p1c01', name: 'ভৌত জগত ও পরিমাপ' },
      { id: 'p1c02', name: 'স্কেলার ও ভেক্টর' },
      { id: 'p1c03', name: 'গতি' },
      { id: 'p1c04', name: 'নিউটনের গতিসূত্র' },
      { id: 'p1c05', name: 'কাজ, ক্ষমতা ও শক্তি' },
      { id: 'p1c06', name: 'মহাকর্ষ ও অভিকর্ষ' },
      { id: 'p1c07', name: 'পদার্থের গাঠনিক ধর্ম' },
      { id: 'p1c08', name: 'পর্যায়বৃত্ত গতি' },
      { id: 'p1c09', name: 'তরঙ্গ' },
      { id: 'p1c10', name: 'আলোকবিজ্ঞান' },
    ],
  },
  // Plan 1 leaves physics2/chem1/.../ict for the follow-up fill-in task.
];
```

- [ ] **Step 3: Firestore seeder (read-only at this step — actual deploy is a later step)**

`apps/web/scripts/seedSyllabus.mjs`:
```js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { SUBJECT_SEED } from '../src/features/syllabus/seedData.bangla.ts';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

for (const s of SUBJECT_SEED) {
  await setDoc(doc(db, `syllabus/board/bangla/${s.subjectId}`), {
    name: s.subjectName,
    chapters: s.chapters,
    updatedAt: Timestamp.now(),
  });
  console.log(`Seeded syllabus/bangla/${s.subjectId}`);
}
```

Add script to `apps/web/package.json`:
```json
"seed:syllabus": "node --import tsx scripts/seedSyllabus.mjs"
```

- [ ] **Step 4: Run shape test**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/syllabus/seedData.shape.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(syllabus): bangla medium seed (physics1 worked example) + seeder"
```

---

### Task 17: SyllabusMap UI + 4-checkbox grid per chapter

**Files:**
- Create: `apps/web/src/features/syllabus/SyllabusMap.tsx`
- Create: `apps/web/src/features/syllabus/useSyllabus.ts`
- Create: `apps/web/tests/features/syllabus/SyllabusMap.test.tsx`

- [ ] **Step 1: Add `@tanstack/react-query` already added in T4; skip**

- [ ] **Step 2: Write failing component test**

`apps/web/tests/features/syllabus/SyllabusMap.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/features/syllabus/useSyllabus', () => ({
  useSyllabus: () => ({
    subjects: [{ subjectId: 'physics1', subjectName: 'Physics 1', chapters: [{ id: 'p1c01', name: 'C1' }] }],
    chapters: { physics1: { p1c01: { firstStudy: false, firstRevision: false, secondRevision: false, thirdRevision: false } } },
    loading: false,
    toggle: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { SyllabusMap } from '@/features/syllabus/SyllabusMap';

describe('SyllabusMap', () => {
  it('renders 4 checkboxes per chapter and toggling calls toggle()', async () => {
    const { useSyllabus } = await import('@/features/syllabus/useSyllabus');
    render(<SyllabusMap uid="u1" medium="bangla" />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    fireEvent.click(screen.getByLabelText(/1st Study/i));
    expect((useSyllabus() as any).toggle).toHaveBeenCalledWith('physics1', 'p1c01', 'firstStudy');
  });
});
```

- [ ] **Step 3: Implement `useSyllabus`**

`apps/web/src/features/syllabus/useSyllabus.ts`:
```ts
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { loadAllSyllabus, type SyllabusLoad } from './loadAllSyllabus';
import type { ChapterState, Stage } from './types';

export function useSyllabus(uid: string, medium: 'bangla' | 'english') {
  const qc = useQueryClient();
  const key = ['syllabus', uid, medium];
  const q = useQuery<SyllabusLoad>({
    queryKey: key,
    queryFn: () => loadAllSyllabus(uid, medium),
    enabled: !!uid,
  });

  const toggle = useMutation({
    mutationFn: async (args: { subjectId: string; chapterId: string; stage: Stage }) => {
      const db = getFirestore(app);
      const ref = doc(db, `users/${uid}/syllabus/${args.subjectId}`);
      const next: ChapterState = {
        firstStudy: false, firstRevision: false, secondRevision: false, thirdRevision: false,
      };
      const prev = q.data?.chapters[args.subjectId]?.[args.chapterId];
      if (prev) Object.assign(next, prev);
      next[args.stage] = !prev?.[args.stage];
      (next as any)[`${args.stage}Date`] = next[args.stage] ? Timestamp.now() : null;
      await setDoc(ref, { chapters: { [args.chapterId]: next } }, { merge: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...q, toggle: toggle.mutateAsync };
}
```

- [ ] **Step 4: Implement `SyllabusMap`**

`apps/web/src/features/syllabus/SyllabusMap.tsx`:
```tsx
import { useTranslation } from 'react-i18next';
import { useSyllabus } from './useSyllabus';
import { subjectCompletion } from './subjectCompletion';
import type { Stage } from './nextTypeFor';

const STAGES: Stage[] = ['firstStudy', 'firstRevision', 'secondRevision', 'thirdRevision'];

export function SyllabusMap({ uid, medium }: { uid: string; medium: 'bangla' | 'english' }) {
  const { t } = useTranslation();
  const { subjects, chapters, loading } = useSyllabus(uid, medium);

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <section className="space-y-6 p-4 text-text">
      {subjects.map((s) => {
        const cm = chapters[s.subjectId] ?? {};
        const pct = subjectCompletion(cm);
        return (
          <article key={s.subjectId} className="rounded-lg border border-surface-2 bg-surface p-3">
            <header className="flex items-baseline justify-between">
              <h2 className="font-display text-lg">{s.subjectName}</h2>
              <span className="text-text-dim text-sm">
                {t('syllabus.completion', { pct: pct.firstStudy })}
              </span>
            </header>
            <ul className="divide-y divide-surface-2">
              {s.chapters.map((c) => {
                const ch = cm[c.id] ?? { firstStudy: false, firstRevision: false, secondRevision: false, thirdRevision: false };
                return (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span>{c.name}</span>
                    <div className="flex gap-3">
                      {STAGES.map((stage) => (
                        <label key={stage} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={!!ch[stage]}
                            aria-label={stage}
                            onChange={() => useSyllabus(uid, medium).toggle({ subjectId: s.subjectId, chapterId: c.id, stage })}
                          />
                          <span>{t(`syllabus.${stage}`)}</span>
                        </label>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 5: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/syllabus/SyllabusMap.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(syllabus): SyllabusMap UI with 4-checkbox grid"
```

---

### Task 18: `scheduledRevisions` Cloud Function + `useSpacedRepetition` hook

**Files:**
- Create: `apps/functions/src/scheduledRevisions.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/functions/tests/scheduledRevisions.test.ts`
- Create: `apps/web/src/features/tasks/useSpacedRepetition.ts`
- Create: `apps/web/tests/features/tasks/spacedRepetition.test.ts`

- [ ] **Step 1: Write failing test for the schedule rule (pure)**

`apps/web/tests/features/tasks/spacedRepetition.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scheduleForFirstStudy } from '@/features/tasks/spacedRepetition';

describe('scheduleForFirstStudy', () => {
  it('returns 3 tasks at +7d, +14d, +30d from firstStudyDate', () => {
    const first = new Date('2026-07-29T10:00:00+06:00');
    const tasks = scheduleForFirstStudy({ subjectId: 's', chapterId: 'c' }, first);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].scheduledFor.getTime() - first.getTime()).toBe(7 * 86400_000);
    expect(tasks[1].scheduledFor.getTime() - first.getTime()).toBe(14 * 86400_000);
    expect(tasks[2].scheduledFor.getTime() - first.getTime()).toBe(30 * 86400_000);
    expect(tasks.map((t) => t.type)).toEqual(['firstRevision', 'secondRevision', 'thirdRevision']);
  });
});
```

- [ ] **Step 2: Implement pure**

`apps/web/src/features/tasks/spacedRepetition.ts`:
```ts
export type ScheduledTask = {
  subjectId: string;
  chapterId: string;
  type: 'firstRevision' | 'secondRevision' | 'thirdRevision';
  scheduledFor: Date;
  source: 'auto-sr';
};

export function scheduleForFirstStudy(
  args: { subjectId: string; chapterId: string },
  firstStudyDate: Date,
): ScheduledTask[] {
  const day = 86400_000;
  return [
    { ...args, type: 'firstRevision', scheduledFor: new Date(firstStudyDate.getTime() + 7 * day), source: 'auto-sr' },
    { ...args, type: 'secondRevision', scheduledFor: new Date(firstStudyDate.getTime() + 14 * day), source: 'auto-sr' },
    { ...args, type: 'thirdRevision', scheduledFor: new Date(firstStudyDate.getTime() + 30 * day), source: 'auto-sr' },
  ];
}
```

- [ ] **Step 3: Implement Cloud Function write-trigger**

`apps/functions/src/scheduledRevisions.ts`:
```ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const day = 86400_000;
const TYPES = ['firstRevision', 'secondRevision', 'thirdRevision'] as const;
type RevType = typeof TYPES[number];
const OFFSETS: Record<RevType, number> = { firstRevision: 7, secondRevision: 14, thirdRevision: 30 };

export const scheduledRevisions = onDocumentWritten(
  'users/{uid}/syllabus/{subjectId}',
  async (event) => {
    const before = event.data?.before.data()?.chapters ?? {};
    const after = event.data?.after.data()?.chapters ?? {};
    const db = getFirestore();
    const writes: Promise<unknown>[] = [];

    for (const [chapterId, afterCh] of Object.entries(after as Record<string, any>)) {
      const prev = (before[chapterId] ?? {}) as { firstStudy?: boolean; firstStudyDate?: { toDate: () => Date } | null };
      const now = afterCh as { firstStudy?: boolean; firstStudyDate?: { toDate: () => Date } | null };
      const justFirstStudy = !prev.firstStudy && !!now.firstStudy && !!now.firstStudyDate;
      if (!justFirstStudy) continue;

      const firstDate = (now.firstStudyDate as { toDate: () => Date }).toDate();
      for (const t of TYPES) {
        const taskId = `sr-${chapterId}-${t}`;
        const ref = db.doc(`users/${event.params.uid}/upcomingTasks/${taskId}`);
        writes.push(ref.set({
          subjectId: event.params.subjectId,
          chapterId,
          type: t,
          source: 'auto-sr',
          scheduledFor: Timestamp.fromMillis(firstDate.getTime() + OFFSETS[t] * day),
          status: 'pending',
          createdAt: Timestamp.now(),
        }, { merge: true }));
      }
    }
    await Promise.all(writes);
  },
);
```

- [ ] **Step 4: Export from index**

Modify `apps/functions/src/index.ts`:
```ts
export { scheduledRevisions } from './scheduledRevisions.js';
```

- [ ] **Step 5: Build + run unit test**

```bash
cd F:/Studytracker/apps/functions
npm run build
cd F:/Studytracker/apps/web
npm test -- tests/features/tasks/spacedRepetition.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/functions apps/web
git commit -m "feat(sr): scheduledRevisions write-trigger + scheduleForFirstStudy"
```

---

### Task 19: `upcomingTasks` CRUD + `useSpacedRepetition` hook

**Files:**
- Create: `apps/web/src/features/tasks/upcomingTasks.ts`
- Create: `apps/web/src/features/tasks/useUpcomingTasks.ts`
- Create: `apps/web/tests/features/tasks/upcomingTasks.test.ts`

- [ ] **Step 1: Write failing test (pure normalize)**

`apps/web/tests/features/tasks/upcomingTasks.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeTask } from '@/features/tasks/upcomingTasks';

describe('normalizeTask', () => {
  it('converts a Firestore-shaped object to a Task with Date', () => {
    const t = normalizeTask({
      id: 't1', subjectId: 's', chapterId: 'c', type: 'firstRevision', source: 'auto-sr',
      status: 'pending', scheduledFor: { toDate: () => new Date('2026-08-05T00:00:00+06:00') },
    });
    expect(t.scheduledFor).toBeInstanceOf(Date);
    expect(t.type).toBe('firstRevision');
  });
});
```

- [ ] **Step 2: Implement `upcomingTasks.ts`**

`apps/web/src/features/tasks/upcomingTasks.ts`:
```ts
import {
  addDoc, collection, deleteDoc, doc, getDocs, getFirestore, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type TaskType = 'firstRevision' | 'secondRevision' | 'thirdRevision' | 'custom';
export type TaskSource = 'manual' | 'auto-sr';
export type TaskStatus = 'pending' | 'done' | 'skipped';

export type UpcomingTask = {
  id: string;
  uid: string;
  subjectId: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  type: TaskType;
  source: TaskSource;
  status: TaskStatus;
  scheduledFor: Date;
  createdAt: Date;
  resolvedAt?: Date | null;
};

type Raw = Omit<UpcomingTask, 'scheduledFor' | 'createdAt' | 'resolvedAt'> & {
  scheduledFor: { toDate: () => Date } | Date;
  createdAt: { toDate: () => Date } | Date;
  resolvedAt?: { toDate: () => Date } | Date | null;
};

export function normalizeTask(raw: Raw): UpcomingTask {
  return {
    ...raw,
    scheduledFor: raw.scheduledFor instanceof Date ? raw.scheduledFor : raw.scheduledFor.toDate(),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : raw.createdAt.toDate(),
    resolvedAt: raw.resolvedAt ? (raw.resolvedAt instanceof Date ? raw.resolvedAt : raw.resolvedAt.toDate()) : null,
  };
}

export async function listUpcomingTasks(uid: string) {
  const db = getFirestore(app);
  const q = query(collection(db, `users/${uid}/upcomingTasks`), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeTask({ id: d.id, uid, ...(d.data() as Omit<Raw, 'id' | 'uid'>) }));
}

export async function addManualTask(uid: string, t: Partial<UpcomingTask> & { subjectId: string; chapterId: string }) {
  const db = getFirestore(app);
  return addDoc(collection(db, `users/${uid}/upcomingTasks`), {
    ...t, source: 'manual', status: 'pending', createdAt: serverTimestamp(), scheduledFor: t.scheduledFor ?? serverTimestamp(),
  });
}

export async function completeUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), { status: 'done', resolvedAt: serverTimestamp() });
}

export async function skipUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), { status: 'skipped', resolvedAt: serverTimestamp() });
}

export async function setUpcomingTask(uid: string, taskId: string, data: Partial<UpcomingTask>) {
  const db = getFirestore(app);
  await setDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), data, { merge: true });
}

export async function deleteUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await deleteDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`));
}
```

- [ ] **Step 3: Implement `useUpcomingTasks`**

`apps/web/src/features/tasks/useUpcomingTasks.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addManualTask, completeUpcomingTask, listUpcomingTasks, skipUpcomingTask } from './upcomingTasks';

export function useUpcomingTasks(uid: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['tasks', uid], queryFn: () => listUpcomingTasks(uid), enabled: !!uid });
  const add = useMutation({
    mutationFn: (t: Parameters<typeof addManualTask>[1]) => addManualTask(uid, t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => completeUpcomingTask(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  const skip = useMutation({
    mutationFn: (id: string) => skipUpcomingTask(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  return { ...q, add, complete, skip };
}
```

- [ ] **Step 4: `useSpacedRepetition` (no-op on the client — writes come from the write-trigger) + add a one-line comment to make intent clear**

`apps/web/src/features/tasks/useSpacedRepetition.ts`:
```ts
// The server-side `scheduledRevisions` write-trigger creates auto-SR tasks
// when a chapter's `firstStudy` flag flips true. This hook is a thin client
// facade for invalidation: callers invalidate ['tasks', uid] after toggling
// a chapter, and the auto-scheduled tasks appear in the next list query.
import { useQueryClient } from '@tanstack/react-query';

export function useSpacedRepetition(uid: string) {
  const qc = useQueryClient();
  return {
    refresh: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  };
}
```

- [ ] **Step 5: Run test — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/tasks
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(tasks): upcomingTasks CRUD + useUpcomingTasks + SR hook"
```

---

### Task 20: TasksScreen UI

**Files:**
- Create: `apps/web/src/features/tasks/TasksScreen.tsx`
- Create: `apps/web/tests/features/tasks/TasksScreen.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: Write failing test**

`apps/web/tests/features/tasks/TasksScreen.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/features/tasks/useUpcomingTasks', () => ({
  useUpcomingTasks: () => ({
    data: [
      { id: 't1', subjectId: 'physics1', chapterId: 'p1c01', type: 'firstRevision',
        source: 'auto-sr', status: 'pending', scheduledFor: new Date('2026-08-05T00:00:00+06:00'),
        createdAt: new Date() },
    ],
    complete: { mutate: vi.fn().mockResolvedValue(undefined) },
    skip: { mutate: vi.fn().mockResolvedValue(undefined) },
    add: { mutate: vi.fn().mockResolvedValue(undefined) },
  }),
}));

import { TasksScreen } from '@/features/tasks/TasksScreen';

describe('TasksScreen', () => {
  it('renders tasks and a markDone button', () => {
    render(<TasksScreen uid="u1" />);
    expect(screen.getByText(/firstRevision/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark done/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `TasksScreen`**

`apps/web/src/features/tasks/TasksScreen.tsx`:
```tsx
import { useTranslation } from 'react-i18next';
import { useUpcomingTasks } from './useUpcomingTasks';

export function TasksScreen({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const { data = [], complete, skip } = useUpcomingTasks(uid);

  if (data.length === 0) return <p className="p-4 text-text-dim">{t('tasks.empty')}</p>;

  return (
    <ul className="divide-y divide-surface-2 p-4">
      {data.map((task) => (
        <li key={task.id} className="flex items-center justify-between py-2">
          <span className="text-text">
            {task.subjectId} · <em>{task.type}</em> · {task.scheduledFor.toDateString()}
          </span>
          <div className="flex gap-2">
            <button onClick={() => complete.mutate(task.id)} className="text-success">{t('tasks.markDone')}</button>
            <button onClick={() => skip.mutate(task.id)} className="text-text-dim">Skip</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Wire route**

Modify `apps/web/src/app/router.tsx`, add to the protected route children:
```tsx
{
  path: '/',
  element: <RequireAuth><RequireProfile><Home /></RequireProfile></RequireAuth>,
  children: [
    { path: 'syllabus', element: <SyllabusMap uid={user.uid} medium="bangla" /> },
    { path: 'tasks', element: <TasksScreen uid={user.uid} /> },
  ],
},
```

(You will need a real `user.uid` in scope; for now use a placeholder `useAuth().user?.uid ?? ''` inside `Home` and pass down, or split `Home` into a shell that uses `Outlet` for nested routes. Whatever the engineer picks, the test in T17/T20 still passes because the screen components are tested in isolation.)

- [ ] **Step 4: Run test + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/tasks/TasksScreen.test.tsx
npm run build
```
Expected: PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(tasks): TasksScreen UI + route wiring"
```

---

### Task 21: GitHub Actions CI (lint → test → build → preview)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the workflow file**

`.github/workflows/ci.yml`:
```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - name: Functions build
        working-directory: apps/functions
        run: |
          npm ci
          npm run build
```

- [ ] **Step 2: Verify the YAML locally with a tool (if `yq` or `python -c 'import yaml'` is available)**

```bash
cd F:/Studytracker
python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK
```
Expected: `OK`. (If python is not available, skip and trust the file.)

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add .github
git commit -m "ci: lint + test + build for web + functions"
```

---

### Task 22: `firebase.json` + Hosting SPA fallback

**Files:**
- Create: `firebase.json`
- Create: `apps/web/public/_redirects`
- Modify: `apps/web/.gitignore` (already covers `.firebase`)

- [ ] **Step 1: Firebase config**

`firebase.json`:
```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public,max-age=31536000,immutable" }] }
    ]
  },
  "firestore": { "rules": "firestore.rules" },
  "functions": [{ "source": "apps/functions", "codebase": "default", "runtime": "nodejs20" }]
}
```

`apps/web/public/_redirects`:
```
/*  /index.html  200
```

- [ ] **Step 2: Commit**

```bash
cd F:/Studytracker
git add firebase.json apps/web/public
git commit -m "chore: firebase hosting + SPA rewrite + immutable assets"
```

---

### Task 23: Playwright e2e smoke (rules-unit + on-screen)

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/e2e/onboarding.spec.ts`
- Modify: `apps/web/package.json` (add `@playwright/test` + script)

- [ ] **Step 1: Add deps + browser**

```bash
cd F:/Studytracker/apps/web
npm i -D @playwright/test@^1.46.0
npx playwright install chromium
```

- [ ] **Step 2: Config**

`apps/web/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: E2E smoke (Sign-in screen renders, Onboarding step 1 renders, Tasks empty state)**

`apps/web/tests/e2e/onboarding.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('sign-in screen renders google button', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
});

test('onboarding step 1 asks for medium', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText(/medium/i)).toBeVisible();
});
```

- [ ] **Step 4: Run Playwright**

```bash
cd F:/Studytracker/apps/web
npm run test:e2e
```

If the dev server is not running, the webServer block starts it. Expected: 2 tests PASS (or 1 PASS if a real Google sign-in blocks step 1 — acceptable for smoke; the full sign-in flow is covered in Plan 3 with mocks).

Add script to `apps/web/package.json`:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "test(e2e): playwright config + onboarding smoke"
```

---

### Task 24: `apps/web/README.md` (local dev) + final full test sweep

**Files:**
- Create: `apps/web/README.md`
- Create: `apps/functions/README.md`

- [ ] **Step 1: Write the READMEs**

`apps/web/README.md`:
```md
# HSC Tracker — Web

## Local dev
1. Copy `.env.example` to `.env` and fill `VITE_FIREBASE_*` keys.
2. `npm install`
3. `npm run dev` — http://localhost:5173

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — TypeScript check + Vite build to `dist/`
- `npm test` — Vitest unit + component
- `npm run test:rules` — `@firebase/rules-unit-testing`
- `npm run test:e2e` — Playwright
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run seed:batches` — Seed `/batches/HSC-2024`…`/batches/HSC-2030`
- `npm run verify:batch-dates` — Print batch dates for admin verification

## Notes
- Syllabus data is **re-typed**, not scraped.
- Batch dates are placeholders — admin must verify before launch.
- i18n: every UI string is a `t()` call. Add Bangla in Plan 3.
```

`apps/functions/README.md`:
```md
# HSC Tracker — Functions (Gen 2, TS)

## Local dev
- `npm install`
- `npm run serve` — builds + starts Firebase emulator

## Deploy
- `npm run deploy` — `firebase deploy --only functions`

## Functions in Plan 1
- `onboardingProfile(callable)` — Auth onCreate-ish
- `recomputeBatchStatusCron(scheduled)` — 00:00 Asia/Dhaka daily
- `recomputeBatchStatusCallable(callable)` — manual admin trigger
- `scheduledRevisions(firestore.onDocumentWritten)` — auto-SR scheduler
```

- [ ] **Step 2: Run the full test sweep**

```bash
cd F:/Studytracker/apps/web
npm run lint
npm test
npm run test:rules
npm run build

cd F:/Studytracker/apps/functions
npm run build
npm test
```
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add apps/web apps/functions
git commit -m "docs: local dev READMEs for web and functions"
```

---

### Task 25: First deploy to Firebase Hosting (preview channel)

**Files:**
- Modify: `.github/workflows/ci.yml` (add preview deploy step on PR)

- [ ] **Step 1: Add a Firebase CLI deploy step on PR (preview channel) and on main (live)**

Append to `.github/workflows/ci.yml`:
```yaml
  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: apps/web/package-lock.json }
      - run: npm ci --prefix apps/web
      - run: npm ci --prefix apps/functions
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: preview-${{ github.event.pull_request.number }}
          expires: 7d
        env:
          FIREBASE_CLI_PREVIEWS: hostingchannels
```

- [ ] **Step 2: Manually trigger a local preview deploy for the human to confirm**

Document the manual flow in the PR description; do NOT run `firebase deploy` from your shell — that needs the human's Firebase project.

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add .github
git commit -m "ci: firebase hosting preview channel on PR"
```

---

## Plan 1 done — handoff

When all 25 tasks are green:
- App boots locally, sign-in + onboarding flow work, syllabus map renders with checkboxes, tasks list shows auto-SR + manual tasks, rules tests pass, CI is green, Firebase preview deploys on PRs.
- **Handoff to Plan 2** (Timer + Progress). The pace card needs the `recomputeBatchStatus` and the user doc shape from this plan — both are done.
- Open follow-ups for Plan 2:
  1. Timer truth source uses `Date.now()` deltas (spec §10).
  2. `users/{uid}/activeSession/current` doc must be added to data model when we implement the timer (not in Plan 1).
  3. `users/{uid}/meta/timeBlocks/{blockId}` doc must be added when we implement daily plan (Plan 2, M5).
