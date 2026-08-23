import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  signInWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: class {
    addScope() {
      return this;
    }
  },
  signInWithRedirect: vi.fn().mockResolvedValue(undefined),
}));

// Mutable auth state: tests mutate it to simulate onAuthStateChanged
// delivering the user AFTER the page reloads from the Google redirect.
let mockAuth = {
  user: null,
  loading: false,
  authError: null as Error | null,
  clearAuthError: () => {},
};

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/lib/firebase/client', () => ({ app: {} }));

import { SignInScreen } from '@/features/auth/SignInScreen';

function RouteProbe({ onPath }: { onPath: (p: string) => void }) {
  onPath(useLocation().pathname);
  return null;
}

function renderScreen(entries: string[] = ['/sign-in']) {
  let path = entries[0];
  const onPath = (p: string) => {
    path = p;
  };
  // New element each call — rerendering with an identical element reference
  // lets React bail out without re-running SignInScreen's effects.
  const buildUi = () => (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={entries}>
        <RouteProbe onPath={onPath} />
        <SignInScreen />
      </MemoryRouter>
    </I18nextProvider>
  );
  const utils = render(buildUi());
  return { ...utils, path: () => path, rerenderFresh: () => utils.rerender(buildUi()) };
}

describe('SignInScreen', () => {
  beforeEach(() => {
    mockAuth = { user: null, loading: false, authError: null, clearAuthError: () => {} };
  });

  it('navigates onward once a user arrives after the Google redirect bounce-back', async () => {
    // Guarded route bounced the visitor to /sign-in with `from: /tasks`.
    const { rerenderFresh, path } = renderScreen([
      { pathname: '/sign-in', state: { from: { pathname: '/tasks' } } } as never,
    ]);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(path()).toBe('/sign-in');

    // signInWithRedirect completes as a page reload; auth state arrives
    // late via onAuthStateChanged. Without routing from here, the user
    // stares at an identical sign-in form forever.
    mockAuth = { ...mockAuth, user: { uid: 'u1' } as never };
    rerenderFresh();

    await waitFor(() => expect(path()).toBe('/tasks'));
  });

  it('defaults to / when there is no `from` state', async () => {
    const { rerenderFresh, path } = renderScreen(['/sign-in']);
    mockAuth = { ...mockAuth, user: { uid: 'u1' } as never };
    rerenderFresh();
    await waitFor(() => expect(path()).toBe('/'));
  });

  it('surfaces redirect errors instead of failing silently', async () => {
    mockAuth = {
      ...mockAuth,
      authError: Object.assign(new Error('unauthorized'), {
        code: 'auth/unauthorized-domain',
      }),
    };
    renderScreen(['/sign-in']);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/authorized domains/i);
  });

  it('shows a finishing state while auth restores after the redirect', () => {
    mockAuth = { ...mockAuth, loading: true };
    renderScreen(['/sign-in']);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });
});
