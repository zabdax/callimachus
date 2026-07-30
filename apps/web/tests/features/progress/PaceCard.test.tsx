import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/progress/useBatch', () => ({
  useBatch: () => ({
    data: {
      label: 'HSC 2026',
      status: 'in-session',
      collegeStart: new Date('2025-07-15T00:00:00+06:00'),
      examStart: new Date('2026-06-30T00:00:00+06:00'),
      examEnd: new Date('2026-08-15T00:00:00+06:00'),
    },
  }),
}));

import { PaceCard } from '@/features/progress/PaceCard';

describe('PaceCard', () => {
  it('renders the batch label', () => {
    render(<PaceCard batchId="HSC-2026" now={new Date('2025-12-01T00:00:00+06:00')} />);
    expect(screen.getByText(/HSC 2026/)).toBeInTheDocument();
  });
});