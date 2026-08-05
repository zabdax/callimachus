import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/features/auth/AuthContext';

export type AdminState = { isAdmin: boolean; loading: boolean };

/**
 * Returns true if the signed-in user has an entry in /admins/{uid}.
 * The Firestore rules use the same check via `isAdmin()` so the
 * admin gate is enforced server-side; this hook is for UX only.
 *
 * Also reports `loading` so `RequireAdmin` can wait until the check
 * resolves instead of redirecting before the read finishes.
 */
export function useIsAdmin(): AdminState {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(
          doc(getFirestore(app), 'admins', user.uid),
        );
        if (!cancelled) setIsAdmin(snap.exists());
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { isAdmin, loading };
}