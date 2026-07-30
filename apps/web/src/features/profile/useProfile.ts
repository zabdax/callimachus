import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type Profile = {
  displayName: string;
  email: string;
  college: string;
  batchId: string | null;
  medium: 'bangla' | 'english' | null;
};

export function useProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(getFirestore(app), `users/${uid}`));
      if (!active) return;
      setProfile(snap.exists() ? (snap.data() as Profile) : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  return { profile, loading };
}
