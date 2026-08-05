import { useState } from 'react';
import type { PlanId } from './plans';

export type SubscribeSubmit = (arg: {
  planId: PlanId;
  trxId: string;
}) => Promise<void>;

type Props = {
  selectedPlanId: PlanId | null;
  onSubmit: SubscribeSubmit;
  busy: boolean;
  error: string | null;
};

/**
 * Per Plan 4 no-screenshot decision: the admin reviews bKash TrxIDs
 * directly (via WhatsApp / email) without a screenshot upload. The
 * form only collects the TrxID + the chosen plan. See HANDOFF.md
 * "R2 skipped" for context.
 */
export function SubscribeForm({ selectedPlanId, onSubmit, busy, error }: Props) {
  const [trxId, setTrxId] = useState('');
  const normalizedTrxId = trxId.trim();
  const validTrxId = /^[A-Za-z0-9_-]{4,64}$/.test(normalizedTrxId);
  const canSubmit = !!selectedPlanId && validTrxId && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPlanId) return;
    await onSubmit({ planId: selectedPlanId, trxId: normalizedTrxId });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      {error && (
        <div role="alert" className="rounded-md bg-danger/10 text-danger p-3 text-sm">
          {error}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">bKash TrxID</span>
        <input
          type="text"
          value={trxId}
          onChange={(e) => setTrxId(e.target.value)}
          required
          className="rounded-md border border-surface-2 bg-surface px-3 py-2"
          placeholder="e.g. TRX123ABC"
          minLength={4}
          maxLength={64}
          pattern="[A-Za-z0-9_-]+"
        />
        {trxId && !validTrxId && <span className="text-xs text-danger">Use 4–64 letters, numbers, underscores, or hyphens.</span>}
      </label>

      <p className="text-xs text-text-dim">
        Submit the TrxID after completing your bKash payment. Your request will be reviewed in the admin queue.
      </p>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-primary text-white py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}