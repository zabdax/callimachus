import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * Returns true if the signed-in user has an entry in /admins/{uid}.
 * The Firestore rules use the same check via `isAdmin()` so the
 * admin gate is enforced server-side; this hook is for UX only.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const snap = await getDoc(
        doc(getFirestore(app), 'admins', user.uid),
      );
      if (!cancelled) setIsAdmin(snap.exists());
    })().catch(() => {
      if (!cancelled) setIsAdmin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return isAdmin;
}