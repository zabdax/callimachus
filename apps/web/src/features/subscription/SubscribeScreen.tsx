import { useState } from 'react';
import { PlansGrid } from './PlansGrid';
import { SubscribeForm } from './SubscribeForm';
import type { PlanId } from './plans';
import type { SubscribeSubmit } from './SubscribeForm';

/**
 * /app/subscribe — page where a user picks a plan, then submits TrxID +
 * screenshot. The actual storage upload + Firestore write is wired up in
 * the next session (signed upload URL + paymentRequests create).
 */
export function SubscribeScreen() {
  const [selected, setSelected] = useState<PlanId | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit: SubscribeSubmit = async () => {
    setError('Upload flow not wired up yet — coming in the next session.');
  };

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