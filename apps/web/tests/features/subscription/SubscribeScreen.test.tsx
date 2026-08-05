import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false }),
}));

vi.mock('@/features/subscription/paymentSubmit', () => ({
  submitPaymentRequest: vi.fn().mockResolvedValue('req-xyz'),
}));

vi.mock('@/features/subscription/SubscribeForm', () => ({
  SubscribeForm: ({
    onSubmit,
  }: {
    selectedPlanId: string;
    onSubmit: (input: { planId: string; trxId: string }) => Promise<void>;
    busy: boolean;
    error: string | null;
  }) => (
    <button
      data-testid="fake-submit"
      onClick={() =>
        onSubmit({ planId: '3m', trxId: 'TXN' })
      }
    >
      fake submit
    </button>
  ),
}));

import { SubscribeScreen } from '@/features/subscription/SubscribeScreen';
import { submitPaymentRequest } from '@/features/subscription/paymentSubmit';

describe('SubscribeScreen', () => {
  beforeEach(() => {
    (submitPaymentRequest as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('renders the heading', () => {
    render(<SubscribeScreen />);
    expect(screen.getByRole('heading', { name: /subscribe to pro/i })).toBeInTheDocument();
  });

  it('does not render the form until a plan is chosen', () => {
    render(<SubscribeScreen />);
    expect(screen.queryByTestId('fake-submit')).not.toBeInTheDocument();
  });

  it('shows the form once a plan is chosen and submits via paymentSubmit', async () => {
    render(<SubscribeScreen />);
    const planButtons = screen.getAllByTestId('plan-choose');
    const second = planButtons[1];
    expect(second).toBeDefined();
    fireEvent.click(second!);
    const btn = await screen.findByTestId('fake-submit');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(submitPaymentRequest).toHaveBeenCalled();
    });
  });

  it('shows the success screen after submission', async () => {
    render(<SubscribeScreen />);
    const planButtons = screen.getAllByTestId('plan-choose');
    const second = planButtons[1];
    expect(second).toBeDefined();
    fireEvent.click(second!);
    const btn = await screen.findByTestId('fake-submit');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByText(/request submitted/i)).toBeInTheDocument(),
    );
  });
});