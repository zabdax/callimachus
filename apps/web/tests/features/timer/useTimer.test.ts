import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '@/features/timer/useTimer';

describe('useTimer state machine', () => {
  it('transitions idle → running → paused → running → idle', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer({ tickMs: 100 }));
    expect(result.current.status).toBe('idle');
    await act(async () => { await result.current.start(); });
    expect(result.current.status).toBe('running');
    await act(async () => { result.current.pause(); });
    expect(result.current.status).toBe('paused');
    await act(async () => { result.current.resume(); });
    expect(result.current.status).toBe('running');
    await act(async () => { result.current.stop(); });
    expect(result.current.status).toBe('idle');
    vi.useRealTimers();
  });
});
