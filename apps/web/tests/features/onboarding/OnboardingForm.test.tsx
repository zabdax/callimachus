import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

const setDocMock = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  doc: vi.fn(() => ({ _doc: true })),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

vi.mock('@/lib/firebase/client', () => ({ app: { _app: true } }));

import { OnboardingForm } from '@/features/onboarding/OnboardingForm';

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('OnboardingForm', () => {
  it('submits medium + batch + college to /users/{uid} via setDoc', async () => {
    const onDone = vi.fn();
    renderWithI18n(<OnboardingForm uid="u1" onDone={onDone} />);

    fireEvent.click(screen.getByLabelText(/Bangla Medium/i));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'HSC-2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    fireEvent.change(screen.getByLabelText(/college/i), {
      target: { value: 'Dhaka College' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        displayName: '',
        college: 'Dhaka College',
        batchId: 'HSC-2026',
        medium: 'bangla',
      }),
    );
    expect(setDocMock).toHaveBeenCalled();
  });
});