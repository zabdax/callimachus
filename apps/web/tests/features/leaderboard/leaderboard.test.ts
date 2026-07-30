import { describe, it, expect } from 'vitest';
import { sortTop10, isRankUnlocked } from '@/features/leaderboard/leaderboard';

describe('leaderboard', () => {
  it('sortTop10 returns top 10 by durationSec desc', () => {
    const users = Array.from({ length: 12 }, (_, i) => ({ uid: `u${i}`, durationSec: 1000 - i * 10 }));
    const top = sortTop10(users);
    expect(top).toHaveLength(10);
    expect(top[0]?.uid).toBe('u0');
  });

  it('isRankUnlocked requires >= 15 minutes', () => {
    expect(isRankUnlocked(14 * 60)).toBe(false);
    expect(isRankUnlocked(15 * 60)).toBe(true);
    expect(isRankUnlocked(16 * 60)).toBe(true);
  });
});
