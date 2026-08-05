import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const docMock = vi.fn();
const getDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
}));

vi.mock('@/lib/firebase/client', () => ({
  app: { _app: true },
}));

const useAuthMock = vi.fn();
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
}));

import { useIsAdmin } from '@/features/admin/useIsAdmin';

describe('useIsAdmin', () => {
  beforeEach(() => {
    docMock.mockReset();
    getDocMock.mockReset();
    useAuthMock.mockReset();
  });

  it('returns false when no user is signed in', async () => {
    useAuthMock.mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('returns false when /admins/{uid} doc does not exist', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' } });
    getDocMock.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it('returns true when /admins/{uid} doc exists', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'admin-uid' } });
    getDocMock.mockResolvedValue({ exists: () => true });
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });
});