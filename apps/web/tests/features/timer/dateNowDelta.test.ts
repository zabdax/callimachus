import { describe, it, expect } from 'vitest';
import { elapsedMs } from '@/features/timer/dateNowDelta';

describe('elapsedMs (Date.now()-anchored)', () => {
  it('returns 0 at the exact start', () => {
    const t = 1_000_000;
    expect(elapsedMs({ startTs: t, pausedAccumMs: 0 }, t)).toBe(0);
  });

  it('returns wall-clock delta minus paused accumulation', () => {
    const t = 1_000_000;
    expect(elapsedMs({ startTs: t, pausedAccumMs: 60_000 }, t + 600_000)).toBe(540_000);
  });

  it('is exact even if the tick is delayed (simulated throttling)', () => {
    // start was 1 hour ago; the tick fires NOW
    const startTs = Date.now() - 3_600_000;
    const got = elapsedMs({ startTs, pausedAccumMs: 0 }, Date.now());
    // ±50 ms tolerance for test execution drift
    expect(Math.abs(got - 3_600_000)).toBeLessThan(50);
  });
});
