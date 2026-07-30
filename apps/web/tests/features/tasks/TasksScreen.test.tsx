import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false }),
}));

vi.mock('@/features/tasks/useUpcomingTasks', () => ({
  useUpcomingTasks: () => ({
    data: [
      {
        id: 't1',
        subjectId: 'physics1',
        chapterId: 'p1c01',
        type: 'firstRevision',
        source: 'auto-sr',
        status: 'pending',
        scheduledFor: new Date('2026-08-05T00:00:00+06:00'),
        createdAt: new Date('2026-07-29T00:00:00+06:00'),
      },
    ],
    complete: { mutate: vi.fn() },
    skip: { mutate: vi.fn() },
    add: { mutate: vi.fn() },
  }),
}));

import { TasksScreen } from '@/features/tasks/TasksScreen';

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('TasksScreen', () => {
  it('renders tasks and a markDone button', () => {
    renderWithI18n(<TasksScreen />);
    expect(screen.getByText(/firstRevision/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark done/i })).toBeInTheDocument();
  });
});