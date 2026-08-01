import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { PlansGrid } from './PlansGrid';
import { SubscribeForm } from './SubscribeForm';
import { submitPaymentRequest } from './paymentSubmit';
import type { PlanId } from './plans';
import type { SubscribeSubmit } from './SubscribeForm';

/**
 * /app/subscribe — page where a user picks a plan, then submits TrxID +
 * screenshot. Uploads via the signed-URL Cloud Function and creates a
 * pending paymentRequest doc.
 */
export function SubscribeScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit: SubscribeSubmit = async (input) => {
    if (!uid) {
      setError('You must be signed in to subscribe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitPaymentRequest({ uid, ...input });
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <main className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-semibold">Request submitted</h1>
        <p className="mt-2 text-slate-600">
          Thanks! Your payment is being reviewed. You'll get a Pro badge within 24 hours.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-4 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Subscribe to Pro</h1>
        <p className="text-sm text-slate-500">
          Pick a plan, send the bKash payment, then submit your TrxID with a screenshot for review.
        </p>
      </header>
      <PlansGrid currentPlanId={selected} onChoose={setSelected} />
      {selected && (
        <SubscribeForm
          selectedPlanId={selected}
          onSubmit={onSubmit}
          busy={busy}
          error={error}
        />
      )}
    </main>
  );
}