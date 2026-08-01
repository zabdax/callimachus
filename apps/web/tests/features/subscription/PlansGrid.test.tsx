import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlansGrid } from '@/features/subscription/PlansGrid';

describe('PlansGrid', () => {
  it('renders exactly 4 plan cards', () => {
    render(<PlansGrid currentPlanId={null} onChoose={vi.fn()} />);
    expect(screen.getAllByTestId('plan-card')).toHaveLength(4);
  });

  it('shows the price for each plan', () => {
    render(<PlansGrid currentPlanId={null} onChoose={vi.fn()} />);
    expect(screen.getByText('৳50')).toBeInTheDocument();
    expect(screen.getByText('৳140')).toBeInTheDocument();
    expect(screen.getByText('৳270')).toBeInTheDocument();
    expect(screen.getByText('৳500')).toBeInTheDocument();
  });

  it('marks the 3-month plan Popular and 6-month plan Best Value', () => {
    render(<PlansGrid currentPlanId={null} onChoose={vi.fn()} />);
    expect(screen.getByText(/popular/i)).toBeInTheDocument();
    expect(screen.getByText(/best value/i)).toBeInTheDocument();
  });

  it('renders per-month price', () => {
    render(<PlansGrid currentPlanId={null} onChoose={vi.fn()} />);
    expect(screen.getByText('৳50/mo')).toBeInTheDocument();
    expect(screen.getByText('৳42/mo')).toBeInTheDocument();
  });

  it('calls onChoose with the plan id when the choose button is clicked', () => {
    const onChoose = vi.fn();
    render(<PlansGrid currentPlanId={null} onChoose={onChoose} />);
    const buttons = screen.getAllByTestId('plan-choose');
    const second = buttons[1];
    expect(second).toBeDefined();
    second!.click();
    expect(onChoose).toHaveBeenCalledWith('3m');
  });

  it('disables the button when the plan is already active', () => {
    render(<PlansGrid currentPlanId={'1m'} onChoose={vi.fn()} />);
    expect(screen.getAllByTestId('plan-choose')[0]).toBeDisabled();
    expect(screen.getAllByTestId('plan-choose')[1]).not.toBeDisabled();
  });
});