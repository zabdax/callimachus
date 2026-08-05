import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { PlansGrid } from './PlansGrid';
import { SubscribeForm } from './SubscribeForm';
import { submitPaymentRequest } from './paymentSubmit';
import type { PlanId } from './plans';
import type { SubscribeSubmit } from './SubscribeForm';

/** A compact TrxID-only payment request flow. */
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
      setError((e as Error).message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <main className="max-w-xl mx-auto p-4">
        <h1 className="font-display text-2xl">Request submitted</h1>
        <p className="mt-2 text-text-dim">
          Thanks! Your payment is being reviewed. You'll get a Pro badge within 24 hours.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-4 flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl">Subscribe to Pro</h1>
        <p className="text-sm text-text-dim">
          Pick a plan, complete your bKash payment, then submit its TrxID for review.
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