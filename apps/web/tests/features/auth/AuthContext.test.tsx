import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
    },
  },
  supabaseConfigError: null,
  toAuthUser: (id: string | undefined, email?: string | null) =>
    id ? { uid: id, email: email ?? null } : null,
}));

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';

function Probe() {
  const { user } = useAuth();
  return <div>{user ? user.uid : 'anon'}</div>;
}

describe('AuthContext', () => {
  it('exposes the current user', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.c' } } },
      error: null,
    });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: () => {} } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('u1')).toBeInTheDocument());
  });
});
