import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (_a: unknown, cb: (u: unknown) => void) => {
    cb({ uid: 'u1', email: 'a@b.c', displayName: 'A' });
    return () => {};
  },
  GoogleAuthProvider: class {
    addScope() {
      return this;
    }
  },
  signInWithPopup: vi.fn().mockResolvedValue({ user: { uid: 'u1' } }),
  signOut: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';

function Probe() {
  const { user } = useAuth();
  return <div>{user ? user.uid : 'anon'}</div>;
}

describe('AuthContext', () => {
  it('exposes the current user', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('u1')).toBeInTheDocument());
  });
});
