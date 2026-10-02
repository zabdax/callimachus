import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({ upsert: (...a: unknown[]) => upsertMock(...a) }),
  },
}));

import { OnboardingForm } from '@/features/onboarding/OnboardingForm';

function renderWithI18n(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('OnboardingForm', () => {
  it('upserts medium + batch + college to profiles without displayName', async () => {
    const onDone = vi.fn();
    renderWithI18n(<OnboardingForm uid="u1" onDone={onDone} />);

    fireEvent.click(screen.getByLabelText(/Bangla Medium/i));
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    // HSC-2026 already resulted, so it must not be offered — pick HSC-2027.
    expect(screen.queryByRole('option', { name: 'HSC 2026' })).toBeNull();
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'HSC-2027' } });
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    fireEvent.change(screen.getByLabelText(/college/i), {
      target: { value: 'Dhaka College' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith({
        college: 'Dhaka College',
        batchId: 'HSC-2027',
        medium: 'bangla',
      }),
    );
    expect(upsertMock).toHaveBeenCalled();
    // Re-submitting onboarding must not clobber an existing profile name.
    const payload = upsertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.id).toBe('u1');
    expect(payload.batch_id).toBe('HSC-2027');
    expect(payload).not.toHaveProperty('display_name');
    expect(payload).not.toHaveProperty('displayName');
  });
});
