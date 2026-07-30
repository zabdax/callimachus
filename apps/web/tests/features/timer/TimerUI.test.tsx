import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/timer/useTimer', () => ({
  useTimer: () => ({
    status: 'running', elapsed: 65_000,
    start: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(),
  }),
}));

import { TimerUI } from '@/features/timer/TimerUI';

describe('TimerUI', () => {
  it('renders 01:05 when elapsed=65000ms and Start is disabled while running', () => {
    render(<TimerUI uid="u1" />);
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause/i })).toBeEnabled();
  });
});
