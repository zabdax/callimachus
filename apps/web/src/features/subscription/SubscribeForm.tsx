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
  const canSubmit = !!selectedPlanId && trxId.trim().length > 0 && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPlanId) return;
    await onSubmit({ planId: selectedPlanId, trxId: trxId.trim() });
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
          className="rounded-md border border-slate-300 px-3 py-2"
          placeholder="e.g. TRX123ABC"
        />
      </label>

      <p className="text-xs text-slate-500">
        After you submit, send the bKash TrxID + screenshot to our
        WhatsApp: +880-XXXX-XXXX. The admin will approve within 24h.
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