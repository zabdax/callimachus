import { useIsAdmin } from './useIsAdmin';

/**
 * Route guard for /admin/* — returns null while checking, redirects to /
 * only after the check confirms the user is NOT admin. Server-side rules
 * still enforce authorization; this is for UX (so a pending admin check
 * doesn't dump a logged-in non-admin onto /).
 */
export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return null; // wait for the getDoc round-trip before deciding
  if (!isAdmin) {
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
    return null;
  }
  return children;
}