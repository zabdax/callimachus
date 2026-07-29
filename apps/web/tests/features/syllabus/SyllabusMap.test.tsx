import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

const toggle = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, loading: false }),
}));

vi.mock('@/features/syllabus/useSyllabus', () => ({
  useSyllabus: () => ({
    subjects: [
      {
        subjectId: 'physics1',
        subjectName: 'Physics 1',
        chapters: [{ id: 'p1c01', name: 'C1' }],
      },
    ],
    chapters: {
      physics1: {
        p1c01: {
          firstStudy: false,
          firstRevision: false,
          secondRevision: false,
          thirdRevision: false,
        },
      },
    },
    loading: false,
    toggle: (args: { subjectId: string; chapterId: string; stage: string }) => {
      toggle(args);
      return Promise.resolve();
    },
  }),
}));

import { SyllabusMap } from '@/features/syllabus/SyllabusMap';

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('SyllabusMap', () => {
  it('renders 4 checkboxes per chapter and toggling calls toggle()', async () => {
    renderWithI18n(<SyllabusMap medium="bangla" />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    fireEvent.click(screen.getByLabelText(/1st Study/i));
    await waitFor(() =>
      expect(toggle).toHaveBeenCalledWith({
        subjectId: 'physics1',
        chapterId: 'p1c01',
        stage: 'firstStudy',
      }),
    );
  });
});
