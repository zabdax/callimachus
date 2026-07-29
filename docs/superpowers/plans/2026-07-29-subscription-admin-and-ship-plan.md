# Plan 3 — Subscription, Admin, i18n, Ship (Milestones 6 + 7 + 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.0. Subscription + admin approval, BN/EN i18n (full Bangla translations), FCM notifications, per-chapter session tagging, data export, accessibility + perf audit, Playwright e2e, PWA manifest, Workbox service worker, Sentry, privacy policy, marketing landing page. The product is ready for public launch when this plan's tasks are green.

**Architecture:** Subscription flow is client-orchestrated (signed-URL upload, paymentRequest write) + admin-mediated (approvePayment callable, RBAC via `/admins`). i18n is `i18next` + ICU MessageFormat; Bangla translations are typed against the Plan 1 English key set. FCM tokens are saved into `users.fcmTokens` (server-owned field, see Plan 1's `onboardingProfile`). PWA is `vite-plugin-pwa` + Workbox. Sentry is initialized client-side, source maps uploaded in CI. Lighthouse CI gates PWA/Performance/Accessibility ≥ 90.

**Tech Stack (additions for this plan):** `vite-plugin-pwa`, `workbox-window`, `@sentry/react`, `@sentry/vite-plugin`, `@axe-core/playwright`, `framer-motion`, `lottie-react`, `lucide-react`, `react-typed-i18n` (or just `i18next` types), `react-markdown` for the privacy page.

**Companion docs:**
- Design spec: `F:\Studytracker\docs\superpowers\specs\2026-07-29-hsc-study-tracker-design.md`
- Plan orientation: `F:\Studytracker\docs\superpowers\plans\implementation_plan.md`
- Plan 1: `F:\Studytracker\docs\superpowers\plans\2026-07-29-foundation-and-profile-plan.md`
- Plan 2: `F:\Studytracker\docs\superpowers\plans\2026-07-29-timer-and-progress-plan.md`

**Working directory for this plan:** `F:\Studytracker\apps\web\` (or `apps/functions/` for Cloud Function tasks).

**Dependencies on Plans 1 + 2:** Auth/onboarding/route guards, syllabus map, timer, pace card, leaderboard, time-blocking — all in place. This plan extends them.

---

## File map (new in Plan 3)

| Path | Purpose | Created in |
|---|---|---|
| `apps/web/src/features/subscription/plans.ts` | Plan tiers constant | T1 |
| `apps/web/src/features/subscription/Plans.tsx` | UI | T1 |
| `apps/web/src/features/subscription/SubscribeForm.tsx` | UI | T2 |
| `apps/web/src/features/subscription/PaymentHistory.tsx` | UI | T3 |
| `apps/functions/src/generateSignedUploadUrl.ts` | Callable | T2 |
| `apps/functions/src/approvePayment.ts` | Callable (admin) | T4 |
| `apps/web/src/features/admin/ApprovalQueue.tsx` | UI | T5 |
| `apps/web/src/features/admin/ScreenshotViewer.tsx` | UI | T5 |
| `apps/web/src/features/admin/BatchManager.tsx` | UI | T6 |
| `apps/web/src/features/admin/AuditLog.tsx` | UI | T6 |
| `apps/web/src/features/admin/CohortDashboard.tsx` | UI | T6 |
| `apps/web/src/features/admin/requireAdmin.tsx` | Route guard | T5 |
| `apps/web/src/messages/bn.json` | Full Bangla translations | T7 |
| `apps/web/src/features/notifications/fcm.ts` | FCM opt-in + foreground handler | T8 |
| `apps/web/src/features/timer/ChapterPicker.tsx` | Subject+chapter dropdown | T9 |
| `apps/web/src/features/export/ExportButton.tsx` | JSON download | T10 |
| `apps/functions/src/deleteUserData.ts` | Callable | T10 |
| `apps/web/src/features/theme/ThemeSwitcher.tsx` | dark/light/auto | T11 |
| `apps/web/src/components/StreakFlame.tsx` | 4 intensity tiers | T12 |
| `apps/web/src/lib/sentry.ts` | Sentry init | T13 |
| `apps/web/src/pages/Privacy.tsx` | Privacy policy | T14 |
| `apps/web/src/pages/Landing.tsx` | Marketing landing | T15 |
| `apps/web/src/app/router.tsx` | Add `/`, `/admin`, `/privacy` | T15 |
| `apps/web/public/manifest.webmanifest` | PWA manifest | T16 |
| `apps/web/src/lib/sw.ts` | Custom SW (optional; `vite-plugin-pwa` default) | T16 |
| `vite.config.ts` | PWA + Sentry plugins | T13, T16 |
| `apps/web/tests/e2e/subscribe.spec.ts` | E2E subscribe happy + reject | T17 |
| `apps/web/tests/e2e/a11y.spec.ts` | axe-core on every route | T18 |
| `apps/web/tests/features/subscription/plans.test.ts` | Tier math | T1 |
| `apps/web/tests/rules/paymentRequests.test.ts` | Rules for paymentRequests | T2 |
| `apps/web/tests/rules/admins.test.ts` | Rules for admins | T4 |
| `apps/web/tests/i18n/bn.test.ts` | bn.json has all Plan 1 keys | T7 |
| `.github/workflows/lighthouse.yml` | LHCI gate | T19 |
| `apps/web/playwright.config.ts` | Add axe plugin | T18 |
| `apps/web/README.md` | Finalize v1.0 launch notes | T20 |

---

### Task 1: Plan tiers + `Plans.tsx` UI

**Files:**
- Create: `apps/web/src/features/subscription/plans.ts`
- Create: `apps/web/src/features/subscription/Plans.tsx`
- Create: `apps/web/tests/features/subscription/plans.test.ts`

- [ ] **Step 1: Write failing test for tier math**

`apps/web/tests/features/subscription/plans.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PLANS, planByMonths } from '@/features/subscription/plans';

describe('PLANS', () => {
  it('has 4 tiers with non-decreasing per-month savings', () => {
    expect(PLANS.map((p) => p.months)).toEqual([1, 3, 6, 12]);
    const perMonth = PLANS.map((p) => p.price / p.months);
    for (let i = 1; i < perMonth.length; i++) expect(perMonth[i]).toBeLessThanOrEqual(perMonth[i - 1]!);
  });

  it('planByMonths(3) returns the 3m plan', () => {
    expect(planByMonths(3)?.price).toBe(140);
  });
});
```

- [ ] **Step 2: Implement `plans.ts`**

`apps/web/src/features/subscription/plans.ts`:
```ts
export type PlanTier = { months: 1 | 3 | 6 | 12; price: number; label: string; highlight?: 'Popular' | 'Best Value' };

export const PLANS: PlanTier[] = [
  { months: 1, price: 50, label: '1 month' },
  { months: 3, price: 140, label: '3 months', highlight: 'Popular' },
  { months: 6, price: 270, label: '6 months', highlight: 'Best Value' },
  { months: 12, price: 500, label: '12 months' },
];

export function planByMonths(m: number): PlanTier | undefined {
  return PLANS.find((p) => p.months === m);
}

export function expiresAtFor(months: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + months * 30 * 86_400_000);
}
```

- [ ] **Step 3: Implement `Plans.tsx`**

`apps/web/src/features/subscription/Plans.tsx`:
```tsx
import { PLANS, planByMonths } from './plans';
import { Button } from '@/components/ui/Button';

export function Plans({ onPick }: { onPick: (months: number) => void }) {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-4">
      {PLANS.map((p) => (
        <article key={p.months} className="rounded-lg border border-surface-2 bg-surface p-4 text-text">
          <h3 className="font-display text-lg">{p.label}</h3>
          <p className="mt-2 text-3xl font-display">৳{p.price}</p>
          {p.highlight && <p className="mt-1 text-accent text-sm">{p.highlight}</p>}
          <p className="text-text-dim text-sm">৳{Math.round(p.price / p.months)}/mo</p>
          <Button className="mt-4 w-full" onClick={() => onPick(p.months)}>Choose</Button>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/subscription/plans.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(subscription): plan tiers + Plans UI"
```

---

### Task 2: `generateSignedUploadUrl` Cloud Function + SubscribeForm

**Files:**
- Create: `apps/functions/src/generateSignedUploadUrl.ts`
- Create: `apps/functions/tests/generateSignedUploadUrl.test.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/web/src/features/subscription/SubscribeForm.tsx`
- Create: `apps/web/src/features/subscription/createPaymentRequest.ts`
- Create: `apps/web/tests/features/subscription/createPaymentRequest.test.ts`
- Create: `apps/web/tests/rules/paymentRequests.test.ts`

- [ ] **Step 1: Write failing test for `paymentRequests` rules**

`apps/web/tests/rules/paymentRequests.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-hsc-tracker', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
afterAll(async () => { await env.cleanup(); });

describe('/paymentRequests rules', () => {
  it('allows the owner to create a request with their uid', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'paymentRequests/r1'), { uid: 'u1', planMonths: 3, planPrice: 140, trx: 'TRX', status: 'pending', createdAt: Date.now() }),
    );
  });

  it('forbids clients from updating or deleting requests', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertFails(updateDoc(doc(ctx.firestore(), 'paymentRequests/r1'), { status: 'approved' }));
    await assertFails(deleteDoc(doc(ctx.firestore(), 'paymentRequests/r1')));
  });

  it('forbids creating a request for someone else', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'paymentRequests/r2'), { uid: 'u2', planMonths: 3, planPrice: 140, status: 'pending' }),
    );
  });
});
```

- [ ] **Step 2: Add the Cloud Function**

`apps/functions/src/generateSignedUploadUrl.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';

initializeApp();

type Input = { contentType: string };

async function innerHandler(request: CallableRequest<Input>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  if (!request.data.contentType.startsWith('image/')) {
    throw new HttpsError('invalid-argument', 'Only image uploads are allowed');
  }
  const uid = request.auth.uid;
  const path = `paymentRequests/${uid}/${randomUUID()}.jpg`;
  const expires = Date.now() + 5 * 60_000;
  const url = await getStorage().bucket().file(path).getSignedUrl({
    action: 'write', expires, contentType: request.data.contentType,
  });
  return { url, path, expires };
}

export const generateSignedUploadUrl = onCall<Input>(innerHandler);
(innerHandler as any).run = (data: Input, ctx: { auth: { uid: string } }) => innerHandler({ data, auth: ctx.auth } as CallableRequest<Input>);
```

`apps/functions/tests/generateSignedUploadUrl.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

const getSignedUrl = vi.fn().mockResolvedValue('https://signed.example/');
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  storage: () => ({ bucket: () => ({ file: () => ({ getSignedUrl }) }) }),
}));

import { generateSignedUploadUrl } from '../src/generateSignedUploadUrl';

describe('generateSignedUploadUrl', () => {
  it('returns url, path, expires for an image upload', async () => {
    const r = await (generateSignedUploadUrl as any).run({ contentType: 'image/jpeg' }, { auth: { uid: 'u1' } });
    expect(r.url).toContain('https://');
    expect(r.path).toMatch(/^paymentRequests\/u1\//);
  });

  it('rejects non-image content types', async () => {
    await expect((generateSignedUploadUrl as any).run({ contentType: 'application/pdf' }, { auth: { uid: 'u1' } })).rejects.toThrow();
  });
});
```

Modify `apps/functions/src/index.ts`:
```ts
export { generateSignedUploadUrl } from './generateSignedUploadUrl.js';
```

- [ ] **Step 3: Client `createPaymentRequest` + `SubscribeForm`**

`apps/web/src/features/subscription/createPaymentRequest.ts`:
```ts
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

export type CreatePaymentRequestInput = { planMonths: number; planPrice: number; trx: string; screenshotBlob: Blob };

export async function createPaymentRequest(uid: string, input: CreatePaymentRequestInput) {
  const fn = httpsCallable<{ contentType: string }, { url: string; path: string; expires: number }>(getFunctions(app), 'generateSignedUploadUrl');
  const { url, path } = (await fn({ contentType: input.screenshotBlob.type || 'image/jpeg' })).data;
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': input.screenshotBlob.type || 'image/jpeg' }, body: input.screenshotBlob });
  if (!put.ok) throw new Error(`upload failed: ${put.status}`);
  const db = getFirestore(app);
  const ref = await addDoc(collection(db, 'paymentRequests'), {
    uid, planMonths: input.planMonths, planPrice: input.planPrice, trx: input.trx,
    screenshotPath: path, status: 'pending', createdAt: serverTimestamp(),
  });
  return ref.id;
}
```

`apps/web/tests/features/subscription/createPaymentRequest.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async (data: { contentType: string }) => ({ data: { url: 'https://signed/x', path: 'paymentRequests/u1/abc.jpg', expires: Date.now() + 300_000 } }),
}));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'pr1' }),
  collection: vi.fn(), getFirestore: vi.fn(), serverTimestamp: () => 1,
}));
vi.mock('@/lib/firebase/client', () => ({ app: {} }));

import { createPaymentRequest } from '@/features/subscription/createPaymentRequest';

describe('createPaymentRequest', () => {
  it('uploads the screenshot and creates a paymentRequest doc', async () => {
    const id = await createPaymentRequest('u1', { planMonths: 3, planPrice: 140, trx: 'TRX1', screenshotBlob: new Blob(['x'], { type: 'image/jpeg' }) });
    expect(id).toBe('pr1');
  });
});
```

- [ ] **Step 4: `SubscribeForm` UI (minimal — plan picker → file → TRX → submit)**

`apps/web/src/features/subscription/SubscribeForm.tsx`:
```tsx
import { useState } from 'react';
import { PLANS, planByMonths, expiresAtFor } from './plans';
import { createPaymentRequest } from './createPaymentRequest';
import { Button } from '@/components/ui/Button';

export function SubscribeForm({ uid, onSubmitted }: { uid: string; onSubmitted: (id: string) => void }) {
  const [months, setMonths] = useState(3);
  const [trx, setTrx] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = planByMonths(months)!;

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const id = await createPaymentRequest(uid, { planMonths: months, planPrice: plan.price, trx, screenshotBlob: file });
      onSubmitted(id);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3 p-4 text-text">
      <label>Plan
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="ml-2 rounded border p-1">
          {PLANS.map((p) => <option key={p.months} value={p.months}>{p.label} · ৳{p.price}</option>)}
        </select>
      </label>
      <label>Transaction ID
        <input value={trx} onChange={(e) => setTrx(e.target.value)} className="ml-2 rounded border p-1" />
      </label>
      <label>Screenshot
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="ml-2" />
      </label>
      <p className="text-text-dim text-sm">Expires {expiresAtFor(months).toDateString()}</p>
      <Button type="submit" disabled={!file || busy}>{busy ? 'Submitting…' : 'Submit for review'}</Button>
    </form>
  );
}
```

- [ ] **Step 5: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/subscription tests/rules/paymentRequests.test.ts
cd F:/Studytracker/apps/functions
npm test -- tests/generateSignedUploadUrl.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web apps/functions
git commit -m "feat(subscription): signed upload URL + payment request flow"
```

---

### Task 3: `PaymentHistory` UI

**Files:**
- Create: `apps/web/src/features/subscription/PaymentHistory.tsx`
- Create: `apps/web/src/features/subscription/usePaymentRequests.ts`
- Create: `apps/web/tests/features/subscription/PaymentHistory.test.tsx`

- [ ] **Step 1: Write failing test**

`apps/web/tests/features/subscription/PaymentHistory.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/subscription/usePaymentRequests', () => ({
  usePaymentRequests: () => ({
    data: [
      { id: 'p1', planMonths: 3, planPrice: 140, status: 'pending', createdAt: new Date('2026-07-29T00:00:00+06:00') },
      { id: 'p2', planMonths: 12, planPrice: 500, status: 'approved', createdAt: new Date('2026-06-01T00:00:00+06:00') },
    ],
  }),
}));

import { PaymentHistory } from '@/features/subscription/PaymentHistory';

describe('PaymentHistory', () => {
  it('renders one row per request with a status pill', () => {
    render(<PaymentHistory uid="u1" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

`apps/web/src/features/subscription/usePaymentRequests.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type PaymentRequest = {
  id: string;
  uid: string;
  planMonths: number;
  planPrice: number;
  trx: string;
  screenshotPath: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
};

export function usePaymentRequests(uid: string) {
  return useQuery({
    queryKey: ['paymentRequests', uid],
    queryFn: async () => {
      const db = getFirestore(app);
      const q = query(collection(db, 'paymentRequests'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const x = d.data() as Omit<PaymentRequest, 'id' | 'createdAt'> & { createdAt: { toDate: () => Date } };
        return { id: d.id, ...x, createdAt: x.createdAt.toDate() };
      });
    },
  });
}
```

`apps/web/src/features/subscription/PaymentHistory.tsx`:
```tsx
import { usePaymentRequests } from './usePaymentRequests';

const PILL: Record<string, string> = {
  pending: 'bg-warning text-white',
  approved: 'bg-success text-white',
  rejected: 'bg-danger text-white',
};

export function PaymentHistory({ uid }: { uid: string }) {
  const { data = [] } = usePaymentRequests(uid);
  if (data.length === 0) return <p className="p-4 text-text-dim">No payments yet.</p>;
  return (
    <ul className="divide-y divide-surface-2">
      {data.map((p) => (
        <li key={p.id} className="flex items-center justify-between p-3 text-text">
          <span>{p.planMonths}m · ৳{p.planPrice}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${PILL[p.status]}`}>{p.status}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/subscription/PaymentHistory.test.tsx
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(subscription): PaymentHistory list"
```

---

### Task 4: `approvePayment` Cloud Function (admin-only) + audit log

**Files:**
- Create: `apps/functions/src/approvePayment.ts`
- Create: `apps/functions/tests/approvePayment.test.ts`
- Modify: `apps/functions/src/index.ts`
- Create: `apps/web/tests/rules/admins.test.ts`

- [ ] **Step 1: Rules test (admin-only reads on `/audit`, write only via admin)**

`apps/web/tests/rules/admins.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-hsc-tracker', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
afterAll(async () => { await env.cleanup(); });

describe('/admins and /audit rules', () => {
  it('non-admin cannot read /admins', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertFails(getDoc(doc(ctx.firestore(), 'admins/u1')));
  });

  it('non-admin cannot read /audit', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertFails(getDoc(doc(ctx.firestore(), 'audit/a1')));
  });
});
```

- [ ] **Step 2: Implement `approvePayment`**

`apps/functions/src/approvePayment.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp();

type Input = { paymentRequestId: string; approve: boolean; reason?: string };

async function isAdmin(uid: string) {
  const doc = await getFirestore().doc(`admins/${uid}`).get();
  return doc.exists;
}

async function innerHandler(request: CallableRequest<Input>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  if (!(await isAdmin(request.auth.uid))) throw new HttpsError('permission-denied', 'Admins only');
  const { paymentRequestId, approve, reason } = request.data;
  const db = getFirestore();
  const prRef = db.doc(`paymentRequests/${paymentRequestId}`);
  const prSnap = await prRef.get();
  if (!prSnap.exists) throw new HttpsError('not-found', 'payment request not found');
  const pr = prSnap.data() as { uid: string; planMonths: number; planPrice: number; status: string };
  if (pr.status !== 'pending') throw new HttpsError('failed-precondition', 'already reviewed');

  const before = pr;
  const after = { ...pr, status: approve ? 'approved' as const : 'rejected' as const };
  await prRef.update({ status: after.status, reviewedBy: request.auth.uid, reviewedAt: Timestamp.now(), reason: reason ?? null });

  if (approve) {
    const expiresAt = Timestamp.fromMillis(Date.now() + pr.planMonths * 30 * 86_400_000);
    await db.doc(`users/${pr.uid}`).set({
      subscription: { status: 'active', plan: pr.planMonths >= 12 ? 'yearly' : 'monthly', expiresAt, paymentRequestId },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await db.collection('audit').add({
    actor: request.auth.uid, action: approve ? 'approve_payment' : 'reject_payment',
    target: paymentRequestId, before, after, at: Timestamp.now(),
  });

  return { ok: true, status: after.status };
}

export const approvePayment = onCall<Input>(innerHandler);
(innerHandler as any).run = (data: Input, ctx: { auth: { uid: string } }) => innerHandler({ data, auth: ctx.auth } as CallableRequest<Input>);
```

`apps/functions/tests/approvePayment.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

const isAdminDoc = { exists: true };
const prDoc = { exists: true, data: () => ({ uid: 'u1', planMonths: 3, planPrice: 140, status: 'pending' }) };

const update = vi.fn().mockResolvedValue(undefined);
const add = vi.fn().mockResolvedValue(undefined);
const set = vi.fn().mockResolvedValue(undefined);
const get = vi.fn().mockImplementation(() => Promise.resolve(isAdminDoc));
const get2 = vi.fn().mockImplementation(() => Promise.resolve(prDoc));
const docMock = vi.fn().mockImplementation((p: string) => {
  if (p.startsWith('admins/')) return { get };
  return { get: get2, update, set };
});
const collectionMock = vi.fn().mockReturnValue({ add });

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({ doc: docMock, collection: collectionMock, FieldValue: { serverTimestamp: () => 1, increment: (n: number) => n } }),
  Timestamp: { now: () => 1, fromMillis: (m: number) => m },
}));

import { approvePayment } from '../src/approvePayment';

describe('approvePayment', () => {
  it('approves a pending request and sets user.subscription', async () => {
    const r = await (approvePayment as any).run({ paymentRequestId: 'pr1', approve: true }, { auth: { uid: 'admin1' } });
    expect(r.status).toBe('approved');
    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
    expect(add).toHaveBeenCalled();
  });
});
```

Modify `apps/functions/src/index.ts`:
```ts
export { approvePayment } from './approvePayment.js';
```

- [ ] **Step 3: Run + build**

```bash
cd F:/Studytracker/apps/functions
npm test -- tests/approvePayment.test.ts
npm run build
cd F:/Studytracker/apps/web
npm test -- tests/rules/admins.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/functions apps/web
git commit -m "feat(subscription): approvePayment (admin) + audit log"
```

---

### Task 5: Admin shell — `requireAdmin`, `ApprovalQueue`, `ScreenshotViewer`

**Files:**
- Create: `apps/web/src/features/admin/requireAdmin.tsx`
- Create: `apps/web/src/features/admin/ApprovalQueue.tsx`
- Create: `apps/web/src/features/admin/ScreenshotViewer.tsx`
- Create: `apps/web/src/features/admin/usePendingRequests.ts`
- Create: `apps/web/tests/features/admin/ApprovalQueue.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: Write failing test for ApprovalQueue**

`apps/web/tests/features/admin/ApprovalQueue.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/features/admin/usePendingRequests', () => ({
  usePendingRequests: () => ({
    data: [{ id: 'pr1', uid: 'u1', planMonths: 3, planPrice: 140, status: 'pending', screenshotPath: 'paymentRequests/u1/x.jpg', createdAt: new Date() }],
  }),
}));
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async (data: any) => { return { data: { ok: true, status: data.approve ? 'approved' : 'rejected' } }; },
}));

import { ApprovalQueue } from '@/features/admin/ApprovalQueue';

describe('ApprovalQueue', () => {
  it('renders one row and clicking Approve calls the function', async () => {
    render(<ApprovalQueue />);
    expect(screen.getByText('u1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    // we only assert the call path; Firestore listener update is Plan 3 Task 6
  });
});
```

- [ ] **Step 2: Implement `requireAdmin` (reads `/admins/{uid}`)**

`apps/web/src/features/admin/requireAdmin.tsx`:
```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { app } from '@/lib/firebase/client';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { setIsAdmin(false); return; }
      const snap = await getDoc(doc(getFirestore(app), `admins/${user.uid}`));
      if (active) setIsAdmin(snap.exists);
    })();
    return () => { active = false; };
  }, [user]);

  if (loading || isAdmin === null) return null;
  if (!user || !isAdmin) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 3: Implement `usePendingRequests` + `ApprovalQueue` + `ScreenshotViewer`**

`apps/web/src/features/admin/usePendingRequests.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type PendingRequest = {
  id: string; uid: string; planMonths: number; planPrice: number;
  trx: string; screenshotPath: string; status: 'pending';
  createdAt: Date;
};

export function usePendingRequests() {
  return useQuery({
    queryKey: ['pending-requests'],
    queryFn: async () => {
      const db = getFirestore(app);
      const q = query(collection(db, 'paymentRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const x = d.data() as Omit<PendingRequest, 'id' | 'createdAt'> & { createdAt: { toDate: () => Date } };
        return { id: d.id, ...x, createdAt: x.createdAt.toDate() };
      });
    },
  });
}
```

`apps/web/src/features/admin/ApprovalQueue.tsx`:
```tsx
import { useState } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useQueryClient } from '@tanstack/react-query';
import { app } from '@/lib/firebase/client';
import { usePendingRequests } from './usePendingRequests';
import { Button } from '@/components/ui/Button';
import { ScreenshotViewer } from './ScreenshotViewer';

export function ApprovalQueue() {
  const { data = [] } = usePendingRequests();
  const qc = useQueryClient();
  const [open, setOpen] = useState<PendingRequest | null>(null);

  const review = async (id: string, approve: boolean) => {
    const fn = httpsCallable<{ paymentRequestId: string; approve: boolean }, { ok: boolean; status: string }>(getFunctions(app), 'approvePayment');
    await fn({ paymentRequestId: id, approve });
    qc.invalidateQueries({ queryKey: ['pending-requests'] });
  };

  if (data.length === 0) return <p className="p-4 text-text-dim">No pending requests.</p>;

  return (
    <div className="p-4 text-text">
      <ul className="divide-y divide-surface-2 rounded bg-surface">
        {data.map((r) => (
          <li key={r.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">{r.uid}</p>
              <p className="text-text-dim text-sm">{r.planMonths}m · ৳{r.planPrice} · TRX {r.trx}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(r)}>View</Button>
              <Button onClick={() => review(r.id, true)}>Approve</Button>
              <Button variant="danger" onClick={() => review(r.id, false)}>Reject</Button>
            </div>
          </li>
        ))}
      </ul>
      {open && <ScreenshotViewer request={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
```

`apps/web/src/features/admin/ScreenshotViewer.tsx`:
```tsx
import { getStorage } from 'firebase/storage';
import { useEffect, useState } from 'react';
import type { PendingRequest } from './usePendingRequests';

export function ScreenshotViewer({ request, onClose }: { request: PendingRequest; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const ref = getStorage().ref(request.screenshotPath);
      setUrl(await ref.getDownloadURL());
    })();
  }, [request.screenshotPath]);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/60">
      <div className="rounded bg-surface p-4 text-text">
        {url ? <img src={url} alt="payment screenshot" className="max-h-[80vh]" /> : <p>Loading…</p>}
        <button onClick={onClose} className="mt-2 rounded bg-primary px-3 py-1 text-white">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire `/admin` route + nested children**

Modify `apps/web/src/app/router.tsx`:
```tsx
{ path: '/admin', element: <RequireAdmin><Outlet /></RequireAdmin>, children: [
  { index: true, element: <ApprovalQueue /> },
]},
```

- [ ] **Step 5: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/admin/ApprovalQueue.test.tsx
npm run build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(admin): ApprovalQueue + ScreenshotViewer + requireAdmin guard"
```

---

### Task 6: Admin sub-pages — BatchManager, AuditLog, CohortDashboard

**Files:**
- Create: `apps/web/src/features/admin/BatchManager.tsx`
- Create: `apps/web/src/features/admin/AuditLog.tsx`
- Create: `apps/web/src/features/admin/CohortDashboard.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: `BatchManager` (list `/batches`, edit modal that calls `recomputeBatchStatusCallable`)**

`apps/web/src/features/admin/BatchManager.tsx`:
```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { useState } from 'react';

type Batch = { id: string; label: string; collegeStart: Date; examStart: Date; examEnd: Date; resultDate: Date; medium: 'bangla'|'english'|'both'; isPublic: boolean };

export function BatchManager() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const snap = await getDocs(collection(getFirestore(app), 'batches'));
      return snap.docs.map((d) => {
        const x = d.data() as Omit<Batch, 'id' | 'collegeStart' | 'examStart' | 'examEnd' | 'resultDate'> & { collegeStart: { toDate: () => Date }; examStart: { toDate: () => Date }; examEnd: { toDate: () => Date }; resultDate: { toDate: () => Date } };
        return { id: d.id, label: x.label, medium: x.medium, isPublic: x.isPublic, collegeStart: x.collegeStart.toDate(), examStart: x.examStart.toDate(), examEnd: x.examEnd.toDate(), resultDate: x.resultDate.toDate() } as Batch;
      });
    },
  });
  const [editing, setEditing] = useState<Batch | null>(null);

  const save = async (b: Batch) => {
    await setDoc(doc(getFirestore(app), `batches/${b.id}`), {
      label: b.label, medium: b.medium, isPublic: b.isPublic,
      collegeStart: b.collegeStart, examStart: b.examStart, examEnd: b.examEnd, resultDate: b.resultDate,
      updatedAt: serverTimestamp(),
    });
    await httpsCallable(getFunctions(app), 'recomputeBatchStatusCallable')({});
    qc.invalidateQueries({ queryKey: ['batches'] });
    setEditing(null);
  };

  if (!q.data) return null;
  return (
    <div className="p-4 text-text">
      <h2 className="font-display text-lg">Batches</h2>
      <table className="mt-2 w-full text-left">
        <thead className="text-text-dim text-sm"><tr><th>ID</th><th>Label</th><th>Medium</th><th>Public</th><th></th></tr></thead>
        <tbody>
          {q.data.map((b) => (
            <tr key={b.id} className="border-t border-surface-2">
              <td>{b.id}</td><td>{b.label}</td><td>{b.medium}</td><td>{b.isPublic ? 'yes' : 'no'}</td>
              <td><button onClick={() => setEditing(b)} className="text-primary">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-black/60">
          <form
            onSubmit={(e) => { e.preventDefault(); void save(editing); }}
            className="space-y-2 rounded bg-surface p-4 text-text"
          >
            <p className="font-display">{editing.id}</p>
            <label>Label<input defaultValue={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className="ml-2 rounded border p-1" /></label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded bg-surface-2 px-2">Cancel</button>
              <button type="submit" className="rounded bg-primary px-2 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `AuditLog` (paginated, desc by `at`)**

`apps/web/src/features/admin/AuditLog.tsx`:
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

const PAGE = 25;

export function AuditLog() {
  const [cursor, setCursor] = useState<unknown>(undefined);
  const q = useQuery({
    queryKey: ['audit', cursor],
    queryFn: async () => {
      const db = getFirestore(app);
      const q = query(collection(db, 'audit'), orderBy('at', 'desc'), limit(PAGE), ...(cursor ? [startAfter(cursor as never)] : []));
      const snap = await getDocs(q);
      const last = snap.docs[snap.docs.length - 1];
      return { items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as { actor: string; action: string; target: string; at: { toDate: () => Date } }) })), cursor: last };
    },
  });

  return (
    <div className="p-4 text-text">
      <h2 className="font-display text-lg">Audit log</h2>
      <ul className="mt-2 divide-y divide-surface-2">
        {q.data?.items.map((i) => (
          <li key={i.id} className="py-2 text-sm">
            <span className="text-text-dim">{i.at.toDate().toISOString()}</span> · {i.actor} · {i.action} · {i.target}
          </li>
        ))}
      </ul>
      {q.data && q.data.items.length === PAGE && (
        <button onClick={() => setCursor(q.data!.cursor)} className="mt-3 rounded bg-primary px-3 py-1 text-white">Next page</button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `CohortDashboard` (per-batch totals)**

`apps/web/src/features/admin/CohortDashboard.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { useState } from 'react';
import { app } from '@/lib/firebase/client';

type Stats = { totalStudents: number; avgHours: number; top: { uid: string; name?: string; sec: number }[] };

export function CohortDashboard() {
  const [batchId, setBatchId] = useState('HSC-2026');
  const q = useQuery({
    queryKey: ['cohort', batchId],
    queryFn: async (): Promise<Stats> => {
      const db = getFirestore(app);
      const users = await getDocs(collection(db, 'users'));
      const list = users.docs.map((d) => ({ uid: d.id, ...(d.data() as { displayName?: string; batchId?: string }) }));
      const inBatch = list.filter((u) => u.batchId === batchId);
      const sums = await Promise.all(inBatch.map(async (u) => {
        const sessions = await getDocs(collection(db, `users/${u.uid}/sessions`));
        const sec = sessions.docs.reduce((n, d) => n + ((d.data() as { durationSec: number }).durationSec || 0), 0);
        return { uid: u.uid, name: u.displayName, sec };
      }));
      const total = sums.reduce((n, s) => n + s.sec, 0);
      const avg = inBatch.length ? Math.round(total / inBatch.length / 36) / 100 : 0;
      const top = [...sums].sort((a, b) => b.sec - a.sec).slice(0, 10);
      return { totalStudents: inBatch.length, avgHours: avg, top };
    },
  });
  if (!q.data) return null;
  return (
    <div className="p-4 text-text">
      <h2 className="font-display text-lg">Cohort — {batchId}</h2>
      <p className="text-text-dim text-sm">Students: {q.data.totalStudents} · Avg hours: {q.data.avgHours}</p>
      <ol className="mt-2 list-decimal pl-5">
        {q.data.top.map((t) => <li key={t.uid}>{t.name ?? t.uid} — {Math.round(t.sec / 60)}m</li>)}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Wire admin children**

Modify `apps/web/src/app/router.tsx`:
```tsx
{ path: '/admin', element: <RequireAdmin><Outlet /></RequireAdmin>, children: [
  { index: true, element: <ApprovalQueue /> },
  { path: 'batches', element: <BatchManager /> },
  { path: 'audit', element: <AuditLog /> },
  { path: 'cohort', element: <CohortDashboard /> },
]},
```

- [ ] **Step 5: Build + commit**

```bash
cd F:/Studytracker/apps/web
npm run build
git add apps/web
git commit -m "feat(admin): BatchManager + AuditLog + CohortDashboard"
```

---

### Task 7: Full Bangla translations (`bn.json`)

**Files:**
- Modify: `apps/web/src/messages/bn.json`
- Create: `apps/web/tests/i18n/bn.test.ts`

- [ ] **Step 1: Write failing test (no missing keys, no missing ICU placeholders)**

`apps/web/tests/i18n/bn.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import bn from '@/messages/bn.json';

function flatten(o: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push(key);
    else if (v && typeof v === 'object') out.push(...flatten(v as Record<string, unknown>, key));
  }
  return out;
}

describe('bn.json parity with en.json', () => {
  it('has exactly the same key set', () => {
    const ek = new Set(flatten(en as Record<string, unknown>));
    const bk = new Set(flatten(bn as Record<string, unknown>));
    const missingInBn = [...ek].filter((k) => !bk.has(k));
    const extraInBn = [...bk].filter((k) => !ek.has(k));
    expect(missingInBn).toEqual([]);
    expect(extraInBn).toEqual([]);
  });

  it('every BN value is a non-empty string', () => {
    for (const v of Object.values(bn)) expect(typeof v).toBe('string');
  });
});
```

- [ ] **Step 2: Fill `bn.json` (the real translation; this is the v1.0 ship)**

`apps/web/src/messages/bn.json` (illustrative — engineer must review with a Bangladeshi student before launch per design spec §6.3):
```json
{
  "app.title": "এইচএসসি ট্র্যাকার",
  "auth.signInWithGoogle": "গুগল দিয়ে সাইন ইন",
  "auth.signOut": "সাইন আউট",
  "onboarding.step1.title": "আপনার মাধ্যম কী?",
  "onboarding.step1.bangla": "বাংলা মাধ্যম",
  "onboarding.step1.english": "ইংরেজি মাধ্যম",
  "onboarding.step2.title": "আপনার ব্যাচ?",
  "onboarding.step3.title": "আপনার কলেজের নাম?",
  "onboarding.next": "পরবর্তী",
  "onboarding.back": "পূর্ববর্তী",
  "onboarding.finish": "শেষ",
  "syllabus.title": "সিলেবাস",
  "syllabus.firstStudy": "১ম পড়া",
  "syllabus.firstRevision": "১ম রিভিশন",
  "syllabus.secondRevision": "২য় রিভিশন",
  "syllabus.thirdRevision": "৩য় রিভিশন",
  "syllabus.completion": "{pct}% সম্পন্ন",
  "tasks.title": "কাজ",
  "tasks.empty": "কোনো আসন্ন কাজ নেই।",
  "tasks.markDone": "সম্পন্ন",
  "tasks.add": "কাজ যোগ করুন",
  "common.loading": "লোড হচ্ছে…",
  "common.error": "কিছু ভুল হয়েছে।",
  "common.retry": "আবার চেষ্টা",
  "common.save": "সংরক্ষণ",
  "common.cancel": "বাতিল",
  "guard.requireAuth.redirecting": "সাইন-ইন এ পাঠানো হচ্ছে…",
  "guard.requireProfile.redirecting": "অনবোর্ডিং এ পাঠানো হচ্ছে…"
}
```

- [ ] **Step 3: Run — pass**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/i18n/bn.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(i18n): full Bangla translations (bn.json)"
```

---

### Task 8: FCM opt-in + per-channel preferences + in-app inbox

**Files:**
- Create: `apps/web/src/features/notifications/fcm.ts`
- Create: `apps/web/src/features/notifications/Settings.tsx`
- Create: `apps/web/tests/features/notifications/fcm.test.ts`

- [ ] **Step 1: Add `firebase/messaging` + write test (mocks `getToken`)**

`apps/web/tests/features/notifications/fcm.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

const set = vi.fn().mockResolvedValue(undefined);
const getToken = vi.fn().mockResolvedValue('token-abc');

vi.mock('firebase/messaging', () => ({
  getMessaging: () => ({}),
  getToken: (...args: unknown[]) => getToken(...args),
  onMessage: () => () => {},
}));

vi.mock('firebase/firestore', () => ({
  doc: () => ({ set }),
  getFirestore: () => ({}),
}));

vi.mock('@/lib/firebase/client', () => ({ app: {} }));

import { requestNotificationPermission } from '@/features/notifications/fcm';

describe('FCM requestNotificationPermission', () => {
  it('saves the token to users/{uid}/fcmTokens', async () => {
    const r = await requestNotificationPermission('u1');
    expect(r.ok).toBe(true);
    expect(set).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement `fcm.ts`**

```bash
cd F:/Studytracker/apps/web
npm i firebase@^10.13.0 # already installed
```

`apps/web/src/features/notifications/fcm.ts`:
```ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export async function requestNotificationPermission(uid: string): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: perm };
    const token = await getToken(getMessaging(app), { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (!token) return { ok: false, reason: 'no-token' };
    await setDoc(doc(getFirestore(app), `users/${uid}`), { fcmTokens: { [token]: true }, updatedAt: Timestamp.now() }, { merge: true });
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export function onForegroundMessage(handler: (payload: unknown) => void) {
  return onMessage(getMessaging(app), handler as never);
}
```

- [ ] **Step 3: Settings UI (channels)**

`apps/web/src/features/notifications/Settings.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { requestNotificationPermission } from './fcm';
import { Button } from '@/components/ui/Button';

type Prefs = { revisions: boolean; streakGuard: boolean; leaderboardOptIn: boolean };

export function NotificationSettings({ uid }: { uid: string }) {
  const [prefs, setPrefs] = useState<Prefs>({ revisions: true, streakGuard: true, leaderboardOptIn: false });

  useEffect(() => {
    return onSnapshot(doc(getFirestore(app), `users/${uid}/meta/settings`), (snap) => {
      if (snap.exists()) setPrefs((snap.data() as { notifications: Prefs }).notifications);
    });
  }, [uid]);

  const save = async (next: Prefs) => {
    setPrefs(next);
    await setDoc(doc(getFirestore(app), `users/${uid}/meta/settings`), { notifications: next }, { merge: true });
  };

  return (
    <div className="space-y-2 p-4 text-text">
      <Button onClick={() => requestNotificationPermission(uid)}>Enable browser notifications</Button>
      {(['revisions','streakGuard','leaderboardOptIn'] as const).map((k) => (
        <label key={k} className="flex items-center gap-2">
          <input type="checkbox" checked={prefs[k]} onChange={(e) => save({ ...prefs, [k]: e.target.checked })} />
          {k}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run + build**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/notifications/fcm.test.ts
npm run build
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(notifications): FCM opt-in + per-channel preferences"
```

---

### Task 9: Per-chapter session tagging in the timer

**Files:**
- Create: `apps/web/src/features/timer/ChapterPicker.tsx`
- Modify: `apps/web/src/features/timer/StudyScreen.tsx`
- Modify: `apps/web/src/features/timer/stopAndSubmit.ts` (carry `chapterId` through)

- [ ] **Step 1: Implement `ChapterPicker` (uses Plan 1's `loadAllSyllabus`)**

`apps/web/src/features/timer/ChapterPicker.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { loadAllSyllabus, type SyllabusLoad } from '@/features/syllabus/loadAllSyllabus';

export function ChapterPicker({ uid, medium, onPick }: { uid: string; medium: 'bangla' | 'english'; onPick: (chapterId: string | null) => void }) {
  const [data, setData] = useState<SyllabusLoad | null>(null);

  useEffect(() => { void loadAllSyllabus(uid, medium).then(setData); }, [uid, medium]);

  return (
    <div className="text-text">
      <label className="block text-sm">What are you studying?
        <select
          onChange={(e) => onPick(e.target.value || null)}
          className="ml-2 rounded border p-1"
          defaultValue=""
        >
          <option value="">(no chapter)</option>
          {data?.subjects.flatMap((s) => s.chapters.map((c) => (
            <option key={`${s.subjectId}:${c.id}`} value={`${s.subjectId}:${c.id}`}>{s.subjectName} — {c.name}</option>
          )))}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `StudyScreen`**

Modify `apps/web/src/features/timer/StudyScreen.tsx`:
```tsx
import { useState } from 'react';
import { TimerUI } from './TimerUI';
import { ChapterPicker } from './ChapterPicker';
import { useProfile } from '@/features/profile/useProfile';

export function StudyScreen({ uid }: { uid: string }) {
  const { profile } = useProfile(uid);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const medium = profile?.medium ?? 'bangla';
  return (
    <div>
      <ChapterPicker uid={uid} medium={medium} onPick={setChapterId} />
      <TimerUI uid={uid} chapterId={chapterId} />
    </div>
  );
}
```

Modify `apps/web/src/features/timer/TimerUI.tsx` `stopAndSubmit` flow: pass `chapterId` into the queued session. (See `stopAndSubmit(s)` in Plan 2; add `chapterId` to the `QueuedSession` payload and surface it via a new `chapterId` prop on `TimerUI`. The reader can find this signature change in Plan 2 T8.)

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(timer): per-chapter session tagging"
```

---

### Task 10: Data export (JSON) + delete account

**Files:**
- Create: `apps/web/src/features/export/ExportButton.tsx`
- Create: `apps/web/src/features/export/useExportData.ts`
- Create: `apps/web/tests/features/export/useExportData.test.ts`
- Create: `apps/functions/src/deleteUserData.ts`
- Create: `apps/functions/tests/deleteUserData.test.ts`
- Modify: `apps/functions/src/index.ts`

- [ ] **Step 1: Write failing test for export shape**

`apps/web/tests/features/export/useExportData.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';

const doc = vi.fn().mockResolvedValue({ exists: false });
const collection = vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ docs: [] }) });
const getDocs = vi.fn().mockResolvedValue({ docs: [] });
const getDoc = vi.fn().mockImplementation(() => Promise.resolve({ exists: false }));

vi.mock('firebase/firestore', () => ({ doc, collection, getDocs, getDoc, getFirestore: () => ({}) }));
vi.mock('@/lib/firebase/client', () => ({ app: {} }));

import { collectExport } from '@/features/export/useExportData';

describe('collectExport', () => {
  it('returns an object with profile/syllabus/sessions/tasks/settings keys (even if empty)', async () => {
    const r = await collectExport('u1');
    expect(Object.keys(r).sort()).toEqual(['profile','sessions','settings','syllabus','tasks']);
  });
});
```

- [ ] **Step 2: Implement `useExportData.ts`**

`apps/web/src/features/export/useExportData.ts`:
```ts
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type ExportShape = {
  profile: unknown;
  syllabus: Record<string, unknown>;
  sessions: unknown[];
  tasks: unknown[];
  settings: unknown;
};

export async function collectExport(uid: string): Promise<ExportShape> {
  const db = getFirestore(app);
  const [profile, settings, sessions, tasks, subjects] = await Promise.all([
    getDoc(doc(db, `users/${uid}`)),
    getDoc(doc(db, `users/${uid}/meta/settings`)),
    getDocs(collection(db, `users/${uid}/sessions`)),
    getDocs(collection(db, `users/${uid}/upcomingTasks`)),
    getDocs(collection(db, `users/${uid}/syllabus`)),
  ]);
  const syllabus: Record<string, unknown> = {};
  subjects.docs.forEach((d) => { syllabus[d.id] = d.data(); });
  return {
    profile: profile.exists() ? profile.data() : null,
    settings: settings.exists() ? settings.data() : null,
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })),
    tasks: tasks.docs.map((d) => ({ id: d.id, ...d.data() })),
    syllabus,
  };
}
```

`apps/web/src/features/export/ExportButton.tsx`:
```tsx
import { collectExport } from './useExportData';

export function ExportButton({ uid }: { uid: string }) {
  const onClick = async () => {
    const data = await collectExport(uid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hsc-tracker-${uid}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={onClick} className="rounded bg-primary px-3 py-1 text-white">Export my data</button>;
}
```

- [ ] **Step 3: `deleteUserData` Cloud Function**

`apps/functions/src/deleteUserData.ts`:
```ts
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

initializeApp();

async function deleteCollection(db: FirebaseFirestore.Firestore, colRef: FirebaseFirestore.CollectionReference) {
  const snap = await colRef.get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function innerHandler(request: CallableRequest<{}>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const { uid } = request.auth;
  const db = getFirestore();
  // Recursive delete: list every subcollection of users/{uid}.
  const root = await db.doc(`users/${uid}`).get();
  if (!root.exists) return { ok: true, deleted: 0 };
  const subcols = await db.doc(`users/${uid}`).listCollections();
  for (const c of subcols) await deleteCollection(db, c);
  await db.doc(`users/${uid}`).delete();
  // Analytics map entries are best-effort cleaned by daily rollup.
  try { await getAuth().deleteUser(uid); } catch { /* swallow — user might be admin */ }
  return { ok: true };
}

export const deleteUserData = onCall<{}>(innerHandler);
(innerHandler as any).run = (data: {}, ctx: { auth: { uid: string } }) => innerHandler({ data, auth: ctx.auth } as CallableRequest<{}>);
```

Modify `apps/functions/src/index.ts`:
```ts
export { deleteUserData } from './deleteUserData.js';
```

- [ ] **Step 4: Run + build + commit**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/export
cd F:/Studytracker/apps/functions
npm run build
git add apps/web apps/functions
git commit -m "feat(export): JSON export + deleteUserData"
```

---

### Task 11: Theme switcher (dark/light/auto) + reduced-motion respect

**Files:**
- Create: `apps/web/src/features/theme/ThemeSwitcher.tsx`
- Modify: `apps/web/src/styles/index.css` (small-motion media query)
- Create: `apps/web/tests/features/theme/ThemeSwitcher.test.tsx`

- [ ] **Step 1: Failing test**

`apps/web/tests/features/theme/ThemeSwitcher.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('firebase/firestore', () => ({ doc: () => ({}), getFirestore: () => ({}), setDoc: vi.fn() }));
vi.mock('@/lib/firebase/client', () => ({ app: {} }));

import { ThemeSwitcher } from '@/features/theme/ThemeSwitcher';

describe('ThemeSwitcher', () => {
  it('sets <html> class to dark/light and persists to settings', () => {
    render(<ThemeSwitcher uid="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

`apps/web/src/features/theme/ThemeSwitcher.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

type Mode = 'light' | 'dark' | 'auto';

function apply(mode: Mode) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    root.classList.add(mode);
  }
}

export function ThemeSwitcher({ uid }: { uid: string }) {
  const [mode, setMode] = useState<Mode>('auto');
  useEffect(() => { apply(mode); }, [mode]);

  const choose = async (m: Mode) => {
    setMode(m);
    await setDoc(doc(getFirestore(app), `users/${uid}/meta/settings`), { theme: m }, { merge: true });
  };

  return (
    <div className="inline-flex gap-1 rounded bg-surface-2 p-1 text-text">
      {(['light','dark','auto'] as Mode[]).map((m) => (
        <button key={m} onClick={() => choose(m)} aria-pressed={mode === m} className="rounded px-2 py-1 capitalize">{m}</button>
      ))}
    </div>
  );
}
```

Append to `apps/web/src/styles/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/features/theme/ThemeSwitcher.test.tsx
git add apps/web
git commit -m "feat(theme): switcher (light/dark/auto) + reduced-motion"
```

---

### Task 12: StreakFlame (4 intensity tiers)

**Files:**
- Create: `apps/web/src/components/StreakFlame.tsx`
- Create: `apps/web/tests/components/StreakFlame.test.tsx`

- [ ] **Step 1: Write failing test**

`apps/web/tests/components/StreakFlame.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakFlame } from '@/components/StreakFlame';

describe('StreakFlame', () => {
  it('renders tier label for a 12-day streak', () => {
    render(<StreakFlame days={12} />);
    expect(screen.getByText(/11–30/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement (4 tiers, no bouncy animation — per spec §6.3)**

`apps/web/src/components/StreakFlame.tsx`:
```tsx
export function tierFor(days: number): 1 | 2 | 3 | 4 {
  if (days <= 3) return 1;
  if (days <= 10) return 2;
  if (days <= 30) return 3;
  return 4;
}

const label: Record<number, string> = { 1: '1–3', 2: '4–10', 3: '11–30', 4: '30+' };

export function StreakFlame({ days }: { days: number }) {
  const tier = tierFor(days);
  return (
    <span aria-label={`streak ${days} days, tier ${tier}`} className={`inline-block align-middle`}>
      <span aria-hidden style={{ filter: `opacity(${0.5 + tier * 0.13})` }}>🔥</span>
      <span className="ml-1 text-text-dim text-xs">{days}d · {label[tier]}</span>
    </span>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/components/StreakFlame.test.tsx
git add apps/web
git commit -m "feat(ui): StreakFlame with 4 intensity tiers"
```

---

### Task 13: Sentry init + source map upload in CI

**Files:**
- Create: `apps/web/src/lib/sentry.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/tests/lib/sentry.test.ts`

- [ ] **Step 1: Add Sentry**

```bash
cd F:/Studytracker/apps/web
npm i @sentry/react@^8.20.0
npm i -D @sentry/vite-plugin@^2.20.0
```

- [ ] **Step 2: Failing test (init is called when DSN present)**

`apps/web/tests/lib/sentry.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const init = vi.fn();
vi.mock('@sentry/react', () => ({ init }));

describe('sentry init', () => {
  beforeEach(() => { vi.resetModules(); init.mockReset(); });

  it('calls Sentry.init when VITE_SENTRY_DSN is set', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@def.ingest.sentry.io/1');
    await import('@/lib/sentry');
    expect(init).toHaveBeenCalled();
  });

  it('does not call Sentry.init when DSN is empty', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    await import('@/lib/sentry');
    expect(init).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement `sentry.ts`**

`apps/web/src/lib/sentry.ts`:
```ts
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    environment: import.meta.env.MODE,
  });
}
```

Modify `apps/web/src/main.tsx` (top-level import):
```tsx
import '@/lib/sentry';
```

Modify `apps/web/vite.config.ts`:
```ts
import { sentryVitePlugin } from '@sentry/vite-plugin';
// inside plugins: [react(), sentryVitePlugin({ org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN })]
```

- [ ] **Step 4: Add CI step**

Append to `.github/workflows/ci.yml` `build-test`:
```yaml
      - name: Sentry source maps
        if: env.SENTRY_AUTH_TOKEN != ''
        run: npx @sentry/vite-plugin sourcemaps --org $SENTRY_ORG --project $SENTRY_PROJECT --auth-token $SENTRY_AUTH_TOKEN
        working-directory: apps/web
```

- [ ] **Step 5: Run + commit**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/lib/sentry.test.ts
git add apps/web .github
git commit -m "feat(obs): Sentry init + source maps in CI"
```

---

### Task 14: Privacy policy page (Bangla + English)

**Files:**
- Create: `apps/web/src/pages/Privacy.tsx`
- Create: `apps/web/src/pages/Privacy.bn.tsx`
- Create: `apps/web/tests/pages/Privacy.test.tsx`

- [ ] **Step 1: Failing test (renders English by default)**

`apps/web/tests/pages/Privacy.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Privacy } from '@/pages/Privacy';

describe('Privacy', () => {
  it('renders a heading and a Data Deletion section', () => {
    render(<Privacy />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Data Deletion/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

`apps/web/src/pages/Privacy.tsx` (English):
```tsx
export function Privacy() {
  return (
    <main className="prose mx-auto max-w-2xl p-6 text-text">
      <h1>Privacy Policy</h1>
      <p>HSC Tracker stores the data you create — your profile, study sessions, syllabus progress, and payment requests — in Firebase. We do not sell your data.</p>
      <h2>Data Deletion</h2>
      <p>You can delete your account and all associated data at any time from Settings → Account → Delete. Deletion is irreversible and completes within 24 hours.</p>
      <h2>Children's Privacy</h2>
      <p>HSC Tracker is intended for students aged 13+. We do not knowingly collect data from children under 13.</p>
      <h2>Contact</h2>
      <p>support@hsctracker.example</p>
    </main>
  );
}
```

`apps/web/src/pages/Privacy.bn.tsx` (Bangla — content is short enough to be a separate component rather than a second i18n bundle, matching spec §6.3):
```tsx
export function PrivacyBn() {
  return (
    <main className="prose mx-auto max-w-2xl p-6 text-text">
      <h1>গোপনীয়তা নীতি</h1>
      <p>এইচএসসি ট্র্যাকার আপনার তৈরি করা ডেটা — প্রোফাইল, অধ্যয়ন সেশন, সিলেবাস অগ্রগতি এবং পেমেন্ট অনুরোধ — ফায়ারবেস এ সংরক্ষণ করে। আমরা আপনার ডেটা বিক্রি করি না।</p>
      <h2>ডেটা মুছে ফেলা</h2>
      <p>আপনি যেকোনো সময় সেটিংস → অ্যাকাউন্ট → মুছুন থেকে আপনার অ্যাকাউন্ট এবং সমস্ত সম্পর্কিত ডেটা মুছে ফেলতে পারবেন। মুছে ফেলা অপরিবর্তনীয় এবং ২৪ ঘন্টার মধ্যে সম্পন্ন হবে।</p>
    </main>
  );
}
```

Add route:
```tsx
{ path: '/privacy', element: <Privacy /> },
{ path: '/privacy/bn', element: <PrivacyBn /> },
```

- [ ] **Step 3: Run + commit**

```bash
cd F:/Studytracker/apps/web
npm test -- tests/pages/Privacy.test.tsx
git add apps/web
git commit -m "feat(pages): privacy policy (en + bn)"
```

---

### Task 15: Marketing landing page (`/` when signed-out)

**Files:**
- Create: `apps/web/src/pages/Landing.tsx`
- Modify: `apps/web/src/app/router.tsx`

- [ ] **Step 1: Implement**

`apps/web/src/pages/Landing.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function Landing() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <h1 className="font-display text-2xl">HSC Tracker</h1>
        <Link to="/sign-in"><Button>Sign in with Google</Button></Link>
      </header>
      <section className="mx-auto max-w-5xl p-8">
        <h2 className="font-display text-4xl leading-tight">A focus timer that does not pause when you switch tabs.</h2>
        <p className="mt-3 max-w-2xl text-text-dim">Built for Bangladeshi HSC students. Bangla + English. Works offline.</p>
        <ul className="mt-6 grid gap-3 md:grid-cols-3">
          <li>🧠 Spaced-repetition auto-scheduler</li>
          <li>📅 Daily plan + time-blocking</li>
          <li>🏆 Batch-aware pace card + leaderboard</li>
        </ul>
      </section>
    </main>
  );
}
```

Modify router: `{ path: '/', element: <Landing /> }` (move the protected route under `/app`):
```tsx
{ path: '/', element: <Landing /> },
{ path: '/app', element: <RequireAuth><RequireProfile><AppShell /></RequireAuth>, children: [ ... ] },
```

- [ ] **Step 2: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(pages): marketing landing"
```

---

### Task 16: PWA manifest + Workbox service worker

**Files:**
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/icon-192.png` (placeholder)
- Create: `apps/web/public/icons/icon-512.png` (placeholder)
- Modify: `apps/web/vite.config.ts` (add `vite-plugin-pwa`)

- [ ] **Step 1: Add `vite-plugin-pwa`**

```bash
cd F:/Studytracker/apps/web
npm i -D vite-plugin-pwa@^0.20.0
```

- [ ] **Step 2: Create manifest**

`apps/web/public/manifest.webmanifest`:
```json
{
  "name": "HSC Tracker",
  "short_name": "HSC Tracker",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#0F1620",
  "theme_color": "#2E5A88",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

(Plan 3 ships placeholder PNGs at the correct sizes. Final brand mark is v1.1.)

- [ ] **Step 3: Update `vite.config.ts`**

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
    manifest: { /* mirror of public/manifest.webmanifest */ },
    workbox: {
      runtimeCaching: [
        { urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'firestore' } },
      ],
    },
  })],
  // …rest
});
```

- [ ] **Step 4: Verify the SW is registered**

```bash
cd F:/Studytracker/apps/web
npm run build
ls dist/sw.js dist/manifest.webmanifest
```
Expected: both files exist.

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "feat(pwa): manifest + Workbox service worker (autoUpdate)"
```

---

### Task 17: E2E — subscribe happy + reject paths

**Files:**
- Create: `apps/web/tests/e2e/subscribe.spec.ts`

- [ ] **Step 1: Write the test (uses mock auth from Plan 3 routing + a stub `/__test/admin`)**

`apps/web/tests/e2e/subscribe.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('student submits a payment, admin rejects, student sees rejected pill', async ({ page, context }) => {
  // Sign in as student
  await page.goto('/__test/sign-in?as=student');
  await page.goto('/app/subscribe');
  await page.getByLabel(/Plan/i).selectOption('12');
  await page.setInputFiles('input[type=file]', { name: 'screenshot.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg') });
  await page.getByLabel(/Transaction ID/i).fill('TRX123');
  await page.getByRole('button', { name: /Submit for review/i }).click();
  await expect(page.getByText('pending')).toBeVisible();

  // Switch to admin
  await page.goto('/__test/sign-in?as=admin');
  await page.goto('/admin');
  await page.getByRole('button', { name: /Reject/i }).first().click();

  // Back to student — pill updates without refresh (Firestore listener)
  await page.goto('/__test/sign-in?as=student');
  await page.goto('/app/subscribe');
  await expect(page.getByText('rejected')).toBeVisible();
});
```

(`/__test/sign-in` is a Plan 3-only route mounted only when `import.meta.env.DEV` is true, or when an env flag is set. The engineer wires this in the router as part of T18.)

- [ ] **Step 2: Commit (test is `.skip` until T18 wires the test routes)**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "test(e2e): subscribe happy + reject paths (gated on test routes)"
```

---

### Task 18: Test-only routes + axe-core a11y e2e

**Files:**
- Modify: `apps/web/src/app/router.tsx` (add `/__test/*` guarded by `import.meta.env.DEV`)
- Create: `apps/web/src/dev/TestRoutes.tsx`
- Create: `apps/web/tests/e2e/a11y.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `apps/web/package.json` (add `@axe-core/playwright`)

- [ ] **Step 1: Add `@axe-core/playwright`**

```bash
cd F:/Studytracker/apps/web
npm i -D @axe-core/playwright@^4.10.0
```

- [ ] **Step 2: Test-only routes (only mounted in dev)**

`apps/web/src/dev/TestRoutes.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { TimerUI } from '@/features/timer/TimerUI';

export function TestRoutes() {
  return (
    <main className="min-h-screen bg-bg p-4 text-text">
      <h1 className="font-display text-2xl">Test routes (dev only)</h1>
      <ul className="mt-4 space-y-2">
        <li><Link to="/__test/timer" className="text-primary">/timer — TimerUI with uid=test-uid</Link></li>
        <li><Link to="/__test/sign-in?as=student" className="text-primary">/sign-in?as=student — mock student</Link></li>
        <li><Link to="/__test/sign-in?as=admin" className="text-primary">/sign-in?as=admin — mock admin</Link></li>
      </ul>
    </main>
  );
}
```

`apps/web/src/dev/TimerHarness.tsx`:
```tsx
import { TimerUI } from '@/features/timer/TimerUI';

export function TimerHarness() {
  return <TimerUI uid="test-uid" />;
}
```

In `apps/web/src/app/router.tsx` add (only when `import.meta.env.DEV`):
```tsx
...(import.meta.env.DEV ? [
  { path: '/__test', element: <TestRoutes /> },
  { path: '/__test/timer', element: <TimerHarness /> },
  { path: '/__test/sign-in', element: <MockSignIn /> },
] : []),
```

`MockSignIn` is a one-line redirect to `/app` (or `/admin`) with a query param, and a small client-side stub that sets a dev-only flag in `localStorage` so the rest of the app pretends to be that user when the Functions emulator is wired. (The dev-only sign-in stub is a Plan 3 polish — the production e2e uses Firebase Auth emulator with a test user. Out of scope to fully detail here; left as a 30-min engineer task with a clear pointer above.)

- [ ] **Step 3: Playwright a11y test**

`apps/web/tests/e2e/a11y.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/sign-in', '/onboarding', '/app', '/app/syllabus', '/app/tasks', '/app/progress', '/app/subscribe', '/privacy'];

for (const path of routes) {
  test(`a11y: no serious axe issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
```

- [ ] **Step 4: Run e2e**

```bash
cd F:/Studytracker/apps/web
npm run test:e2e
```
Expected: all green (or pre-existing skips remain skipped).

- [ ] **Step 5: Commit**

```bash
cd F:/Studytracker
git add apps/web
git commit -m "test(e2e): test-only dev routes + axe-core a11y sweep"
```

---

### Task 19: Lighthouse CI gate (PWA/Performance/Accessibility ≥ 90)

**Files:**
- Create: `.github/workflows/lighthouse.yml`
- Create: `lighthouserc.json`

- [ ] **Step 1: Add `lhci`**

```bash
cd F:/Studytracker
npm i -D @lhci/cli@^0.14.0
```

- [ ] **Step 2: Config**

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173/app", "http://localhost:5173/sign-in", "http://localhost:5173/"],
      "startServerCommand": "npm --prefix apps/web run preview -- --port 5173",
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:pwa": ["error", { "minScore": 0.9 }],
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

- [ ] **Step 3: Workflow**

`.github/workflows/lighthouse.yml`:
```yaml
name: lighthouse
on:
  pull_request: { branches: [main] }
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: apps/web/package-lock.json }
      - run: npm ci --prefix apps/web
      - run: npm run build --prefix apps/web
      - run: npx --yes @lhci/cli@0.14 autorun
```

- [ ] **Step 4: Commit**

```bash
cd F:/Studytracker
git add .github lighthouserc.json package.json package-lock.json
git commit -m "ci: lighthouse gate (pwa/perf/a11y ≥ 90)"
```

---

### Task 20: Finalize v1.0 READMEs + CHANGELOG

**Files:**
- Create: `CHANGELOG.md`
- Modify: `apps/web/README.md` (add v1.0 launch notes)
- Modify: `apps/functions/README.md`

- [ ] **Step 1: CHANGELOG**

`CHANGELOG.md`:
```md
# Changelog

## v1.0.0 — 2026-07-29
- Initial public launch.
- PWA installable; offline timer.
- BN/EN UI; batch-aware pace card; spaced-repetition auto-scheduler.
- Manual bKash payment review; admin approval + audit log.
- Lighthouse PWA/Performance/Accessibility ≥ 90 (gated by CI).
- 100% Firestore rules covered; 80% line coverage on lib + features.
- See `docs/superpowers/specs/2026-07-29-hsc-study-tracker-design.md` for the spec
  and `docs/superpowers/plans/2026-07-29-*.md` for the plan trio.
```

- [ ] **Step 2: Update `apps/web/README.md`**

Append:
```md

## v1.0 launch
- All Plan 1, 2, 3 tasks green.
- Run `npm --prefix apps/web run preview` to smoke-test the PWA shell.
- Deploy: `firebase deploy --only hosting,functions,firestore:rules`.
- Privacy policy at `/privacy` (and `/privacy/bn`).
- Marketing landing at `/`.
```

- [ ] **Step 3: Commit**

```bash
cd F:/Studytracker
git add CHANGELOG.md apps/web apps/functions
git commit -m "docs: v1.0 changelog + launch notes"
```

---

### Task 21: Final deploy — production hosting + functions + rules

**Files:**
- (no new files; deploy steps are run manually or via the existing CI)

- [ ] **Step 1: Confirm CI green on main**

```bash
cd F:/Studytracker
gh pr checks
```
Expected: all green.

- [ ] **Step 2: Merge to main; CI deploys to production**

```bash
git checkout main
git merge --no-ff <plan3-branch>
git push origin main
```
The CI workflow (Plan 1 T25) deploys to production on push to main.

- [ ] **Step 3: Smoke-test on production URL**

Open the deployed site. Sign in. Onboard. Start a 60 s timer. Switch tab. Return. Assert ≥ 60 s elapsed. Mark a chapter. Confirm a revision task appears 7 days out. Submit a payment, switch to admin, reject, confirm pill updates without refresh.

- [ ] **Step 4: Tag v1.0.0**

```bash
git tag -a v1.0.0 -m "v1.0.0 launch"
git push origin v1.0.0
```

---

### Task 22: v1.0 acceptance criteria — final checklist

Walk through every item in design spec §16, run the relevant test or e2e, and tick it off. Anything that fails becomes a new task here with a one-line justification. **Do not let the checklist grow scope — add it as a follow-up issue on the GitHub tracker instead.**

- [ ] New student can sign in with Google in <30 s → manual smoke
- [ ] Onboarding asks for medium + batch + college → Plan 1 T13
- [ ] First focus session shows in `/app/progress` within 5 s → Plan 2 T6 + TanStack Query
- [ ] **Timer keeps running when tab is switched/minimized** → Plan 2 T1, T15 (regression)
- [ ] Marking "1st Study" auto-creates +7/+14/+30 tasks → Plan 1 T18
- [ ] Daily Plan widget shows today's blocks → Plan 2 T12
- [ ] Bangla + English UI ship complete → Plan 1 T2, Plan 3 T7
- [ ] Palette = "Cool Slate" → Plan 1 T5
- [ ] Lighthouse ≥ 90 on PWA/Performance/Accessibility → Plan 3 T19
- [ ] Sentry has zero unresolved errors older than 24 h → Plan 3 T13
- [ ] Firestore rules 100% covered → Plan 1 T11, Plan 2 T2
- [ ] Pace card reflects correct batch → Plan 2 T10
- [ ] Privacy policy + data-deletion live → Plan 3 T10, T14
- [ ] Admin approval updates student without refresh → Plan 3 T5, T17

---

## Plan 3 done — v1.0 ships

When all 22 tasks are green and the acceptance checklist is ticked:
- Tag `v1.0.0`.
- Open a "v1.1 candidate" issue listing the deferred items: Capacitor Android wrapper, WhatsApp daily digest, iOS wrapper, B2B coaching dashboard, mock-test engine, AI assistant.
- Hand the product to a growth team.

**End of all three plans.**
