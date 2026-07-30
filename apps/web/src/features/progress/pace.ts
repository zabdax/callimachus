import type { BatchDates } from '@/features/batches/recomputeBatchStatus';

export function pacePct(b: BatchDates, now: Date): number {
  const total = b.examStart.getTime() - b.collegeStart.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - b.collegeStart.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export function remainingDays(b: BatchDates, now: Date): number {
  const diff = b.examStart.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

export function forecastFinishDate(
  input: { remainingChapters: number; minutesPerChapter: number; avgMinPerDay: number },
  now: Date,
): Date {
  const need = (input.remainingChapters * input.minutesPerChapter) / Math.max(1, input.avgMinPerDay);
  return new Date(now.getTime() + Math.ceil(need) * 86_400_000);
}