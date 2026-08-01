import { streakTier, type StreakTier } from './streak';

const COLORS: Record<StreakTier, string> = {
  spark: 'text-slate-400',
  ember: 'text-orange-400',
  flame: 'text-orange-500',
  blaze: 'text-red-500',
  inferno: 'text-red-600',
};

export function StreakFlame({ days }: { days: number }) {
  const tier = streakTier(days);
  const color = COLORS[tier];
  return (
    <span
      data-testid="streak-flame"
      data-tier={tier}
      className={`inline-flex items-center gap-1 font-semibold ${color}`}
      aria-label={`${days} day streak (${tier})`}
    >
      <span aria-hidden>🔥</span>
      <span>{days}</span>
    </span>
  );
}