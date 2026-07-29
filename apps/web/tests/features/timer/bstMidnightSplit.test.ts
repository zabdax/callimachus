import { describe, it, expect } from 'vitest';
import { splitByLocalMidnight } from '@/lib/time/bst';

describe('splitByLocalMidnight (Asia/Dhaka)', () => {
  it('a 60-min session from 23:30 to 00:30 splits into 30 + 30', () => {
    const segs = splitByLocalMidnight(
      new Date('2026-07-29T23:30:00+06:00').getTime(),
      new Date('2026-07-30T00:30:00+06:00').getTime(),
      'Asia/Dhaka',
    );
    expect(segs).toHaveLength(2);
    const first = segs[0]!;
    const second = segs[1]!;
    expect(first.date).toBe('2026-07-29');
    expect(first.durationSec).toBe(30 * 60);
    expect(second.date).toBe('2026-07-30');
    expect(second.durationSec).toBe(30 * 60);
  });

  it('a session entirely on one day does not split', () => {
    const segs = splitByLocalMidnight(
      new Date('2026-07-29T10:00:00+06:00').getTime(),
      new Date('2026-07-29T11:00:00+06:00').getTime(),
      'Asia/Dhaka',
    );
    expect(segs).toHaveLength(1);
    const only = segs[0]!;
    expect(only.date).toBe('2026-07-29');
    expect(only.durationSec).toBe(3600);
  });
});
