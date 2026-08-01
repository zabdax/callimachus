import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscribeForm } from '@/features/subscription/SubscribeForm';

describe('SubscribeForm (no-screenshot Plan 4 flow)', () => {
  const baseProps = {
    selectedPlanId: '3m' as const,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    busy: false,
    error: null,
  };

  it('renders the trxId input with label', () => {
    render(<SubscribeForm {...baseProps} />);
    expect(screen.getByLabelText(/bKash trxid/i)).toBeInTheDocument();
  });

  it('does NOT render a file input (no screenshot in the no-R2 flow)', () => {
    render(<SubscribeForm {...baseProps} />);
    expect(screen.queryByLabelText(/screenshot/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with planId + trxId (no file) when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/bKash trxid/i), {
      target: { value: 'TXN12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [arg] = onSubmit.mock.calls[0] as [{ planId: string; trxId: string }];
    expect(arg.planId).toBe('3m');
    expect(arg.trxId).toBe('TXN12345');
  });

  it('does not call onSubmit if trxId is empty', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables submit while busy', () => {
    render(<SubscribeForm {...baseProps} busy={true} />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('renders an error banner when error is set', () => {
    render(<SubscribeForm {...baseProps} error="Upload failed" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i);
  });

  it('does not submit if planId is missing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} selectedPlanId={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/bKash trxid/i), {
      target: { value: 'TXN12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});