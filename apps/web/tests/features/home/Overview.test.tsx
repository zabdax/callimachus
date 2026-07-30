import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
vi.mock('@/features/profile/useProfile', () => ({ useProfile: () => ({ profile: { batchId: 'HSC-2026', displayName: '', email: '', college: '', medium: 'bangla' }, loading: false }) }));
vi.mock('@/features/progress/useBatch', () => ({
  useBatch: () => ({ data: { label: 'HSC 2026', status: 'in-session', collegeStart: new Date(), examStart: new Date(), examEnd: new Date() } }),
}));
vi.mock('@/features/dailyPlan/DailyPlanCard', () => ({ DailyPlanCard: () => <div data-testid="daily-plan-card" /> }));

import { Overview } from '@/features/home/Overview';

describe('Overview', () => {
  it('renders PaceCard label and Days to HSC exam', () => {
    render(<Overview />);
    expect(screen.getByText(/HSC 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Days to HSC exam/i)).toBeInTheDocument();
  });
});