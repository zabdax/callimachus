import { describe, it, expect, beforeEach } from 'vitest';
import { saveAnchor, loadAnchor, clearAnchor } from '@/features/timer/persistence';

describe('timer persistence (localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips an anchor', () => {
    const a = { startTs: 1, pausedAccumMs: 2, serverStartTs: 3 };
    saveAnchor('u1', a);
    expect(loadAnchor('u1')).toEqual(a);
  });

  it('clears the anchor', () => {
    saveAnchor('u1', { startTs: 1, pausedAccumMs: 0, serverStartTs: 1 });
    clearAnchor('u1');
    expect(loadAnchor('u1')).toBeNull();
  });
});
