import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type Profile = { displayName: string; email: string; college: string; batchId: string | null; medium: 'bangla' | 'english' | null };
export function useProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    if (!uid) { setProfile(null); setLoading(false); setError(null); return () => { active = false; }; }
    setLoading(true); setError(null);
    void getDoc(doc(getFirestore(app), `users/${uid}`)).then((snap) => {
      if (active) setProfile(snap.exists() ? snap.data() as Profile : null);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason : new Error('Profile request failed'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid]);
  return { profile, loading, error };
}
