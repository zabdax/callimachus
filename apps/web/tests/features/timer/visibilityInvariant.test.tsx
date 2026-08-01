import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimer } from '@/features/timer/useTimer';

describe('useTimer survives tab visibility changes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps counting when the document becomes hidden (regression for M4 bug)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
    const start = Date.now();
    const { result, rerender } = renderHook(() => useTimer({ uid: 'vis-test' }));

    act(() => {
      void result.current.start();
    });
    rerender();

    const elapsedBefore = result.current.elapsed;

    // Simulate the tab being hidden for 60 seconds, then visible again.
    act(() => {
      vi.setSystemTime(new Date(start + 60_000));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    rerender();

    const elapsedAfter = result.current.elapsed;
    // 60s hidden = 60s more elapsed (no pause).
    expect(elapsedAfter - elapsedBefore).toBeGreaterThanOrEqual(59_500);
  });
});
