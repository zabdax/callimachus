import { describe, it, expect } from 'vitest';
import { streakTier, type StreakTier } from '@/features/streak/streak';

describe('streakTier', () => {
  it('returns "spark" for 0 days', () => {
    expect(streakTier(0)).toBe<StreakTier>('spark');
  });

  it('returns "ember" for 1-3 days', () => {
    expect(streakTier(1)).toBe<StreakTier>('ember');
    expect(streakTier(3)).toBe<StreakTier>('ember');
  });

  it('returns "flame" for 4-10 days', () => {
    expect(streakTier(4)).toBe<StreakTier>('flame');
    expect(streakTier(10)).toBe<StreakTier>('flame');
  });

  it('returns "blaze" for 11-30 days', () => {
    expect(streakTier(11)).toBe<StreakTier>('blaze');
    expect(streakTier(30)).toBe<StreakTier>('blaze');
  });

  it('returns "inferno" for 31+ days', () => {
    expect(streakTier(31)).toBe<StreakTier>('inferno');
    expect(streakTier(365)).toBe<StreakTier>('inferno');
  });
});