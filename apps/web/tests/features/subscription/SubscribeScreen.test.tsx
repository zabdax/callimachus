import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscribeScreen } from '@/features/subscription/SubscribeScreen';

vi.mock('@/features/subscription/SubscribeForm', () => ({
  SubscribeForm: () => <div data-testid="mock-subscribe-form" />,
}));

describe('SubscribeScreen', () => {
  it('renders the heading', () => {
    render(<SubscribeScreen />);
    expect(screen.getByRole('heading', { name: /subscribe to pro/i })).toBeInTheDocument();
  });

  it('does not render the form until a plan is chosen', () => {
    render(<SubscribeScreen />);
    expect(screen.queryByTestId('mock-subscribe-form')).not.toBeInTheDocument();
  });

  it('has exactly 4 plan cards', () => {
    render(<SubscribeScreen />);
    expect(screen.getAllByTestId('plan-card')).toHaveLength(4);
  });
});