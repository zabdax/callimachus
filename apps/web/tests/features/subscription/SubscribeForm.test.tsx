import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscribeForm } from '@/features/subscription/SubscribeForm';

describe('SubscribeForm', () => {
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

  it('renders the screenshot input', () => {
    render(<SubscribeForm {...baseProps} />);
    expect(screen.getByLabelText(/screenshot/i)).toBeInTheDocument();
  });

  it('calls onSubmit with trxId and file when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/bKash trxid/i), {
      target: { value: 'TXN12345' },
    });
    const file = new File(['x'], 'screenshot.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/screenshot/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const callArgs = onSubmit.mock.calls[0];
    expect(callArgs).toBeDefined();
    const arg = callArgs![0] as { planId: string; trxId: string; file: File };
    expect(arg.planId).toBe('3m');
    expect(arg.trxId).toBe('TXN12345');
    expect(arg.file).toBe(file);
  });

  it('does not call onSubmit if trxId is empty', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit if no file is chosen', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/bKash trxid/i), {
      target: { value: 'TXN12345' },
    });
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

  it('does not submit if planId is missing', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubscribeForm {...baseProps} selectedPlanId={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/bKash trxid/i), {
      target: { value: 'TXN12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});