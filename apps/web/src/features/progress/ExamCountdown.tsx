import { useBatch } from './useBatch';
import { remainingDays } from './pace';

export function ExamCountdown({ batchId, now }: { batchId: string; now: Date }) {
  const { data: batch } = useBatch(batchId);
  if (!batch) return null;
  const days = remainingDays(batch, now);
  return (
    <div className="rounded-lg bg-surface-2 p-4 text-text">
      <p className="text-text-dim text-sm">Days to HSC exam</p>
      <p className="font-display text-3xl">{days}</p>
    </div>
  );
}