import { useState } from 'react';
import type { PlanId } from './plans';

export type SubscribeSubmit = (arg: {
  planId: PlanId;
  trxId: string;
  file: File;
}) => Promise<void>;

type Props = {
  selectedPlanId: PlanId | null;
  onSubmit: SubscribeSubmit;
  busy: boolean;
  error: string | null;
};

export function SubscribeForm({ selectedPlanId, onSubmit, busy, error }: Props) {
  const [trxId, setTrxId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const canSubmit = !!selectedPlanId && trxId.trim().length > 0 && !!file && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPlanId || !file) return;
    await onSubmit({ planId: selectedPlanId, trxId: trxId.trim(), file });
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

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Payment screenshot</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="rounded-md border border-slate-300 px-3 py-2 bg-white"
        />
      </label>

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