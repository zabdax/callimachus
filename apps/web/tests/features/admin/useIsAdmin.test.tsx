import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const maybeSingleMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: (...a: unknown[]) => maybeSingleMock(...a) }) }),
    }),
  },
}));

const useAuthMock = vi.fn();
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

import { useIsAdmin } from '@/features/admin/useIsAdmin';

describe('useIsAdmin', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    useAuthMock.mockReset();
  });

  it('returns false when no user is signed in', async () => {
    useAuthMock.mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('returns false when no admins row exists', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' } });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it('returns true when an admins row exists', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'admin-uid' } });
    maybeSingleMock.mockResolvedValue({ data: { uid: 'admin-uid' }, error: null });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });
});
