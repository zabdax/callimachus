import { useIsAdmin } from './useIsAdmin';

/**
 * Route guard for /admin/* — returns null while checking, redirect to / when
 * the user is not an admin. Server-side rules still enforce authorization.
 */
export function RequireAdmin({ children }: { children: JSX.Element }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    // simple redirect via window for the guard; the route loader will run
    // server-side enforcement regardless.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
    return null;
  }
  return children;
}