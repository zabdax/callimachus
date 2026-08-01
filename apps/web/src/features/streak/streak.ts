export type StreakTier = 'spark' | 'ember' | 'flame' | 'blaze' | 'inferno';

/**
 * Maps a streak day count to an intensity tier:
 *  - 0       → spark  (no streak)
 *  - 1-3     → ember
 *  - 4-10    → flame
 *  - 11-30   → blaze
 *  - 31+     → inferno
 */
export function streakTier(days: number): StreakTier {
  if (days <= 0) return 'spark';
  if (days <= 3) return 'ember';
  if (days <= 10) return 'flame';
  if (days <= 30) return 'blaze';
  return 'inferno';
}