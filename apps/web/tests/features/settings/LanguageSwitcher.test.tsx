import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LanguageSwitcher } from '@/features/settings/LanguageSwitcher';

function setupI18n() {
  i18next.use(initReactI18next).init({
    resources: {
      en: { translation: { 'settings.language': 'Language' } },
      bn: { translation: { 'settings.language': 'ভাষা' } },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  return i18next;
}

describe('LanguageSwitcher', () => {
  it('renders English and বাংলা options', () => {
    const i = setupI18n();
    render(
      <I18nextProvider i18n={i}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );
    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
  });

  it('changes language when a new option is selected', () => {
    const i = setupI18n();
    render(
      <I18nextProvider i18n={i}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );
    const select = screen.getByRole('combobox', { name: /language/i });
    fireEvent.change(select, { target: { value: 'bn' } });
    expect(i.language).toBe('bn');
  });

  it('writes the choice to localStorage for persistence', () => {
    const i = setupI18n();
    localStorage.clear();
    render(
      <I18nextProvider i18n={i}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );
    fireEvent.change(screen.getByRole('combobox', { name: /language/i }), {
      target: { value: 'bn' },
    });
    expect(localStorage.getItem('app.lang')).toBe('bn');
  });
});