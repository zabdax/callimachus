import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/timer/useTimer', () => ({
  useTimer: () => ({
    status: 'idle',
    elapsed: 0,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@/features/timer/serverAnchor', () => ({
  callSessionStart: vi.fn().mockResolvedValue({ serverStartTs: 0 }),
}));

// Import AFTER mocks are registered.
import { TestTimerScreen } from '@/features/timer/TestTimerScreen';

describe('TestTimerScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a heading identifying the dev-only route', () => {
    render(<TestTimerScreen />);
    expect(
      screen.getByRole('heading', { name: /dev timer/i }),
    ).toBeInTheDocument();
  });

  it('renders the TimerUI which exposes a Start button when idle', () => {
    render(<TestTimerScreen />);
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });
});
