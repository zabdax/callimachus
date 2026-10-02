import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type Profile = { displayName: string; email: string; college: string; batchId: string | null; medium: 'bangla' | 'english' | null };
export function useProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    if (!uid) { setProfile(null); setLoading(false); setError(null); return () => { active = false; }; }
    setLoading(true); setError(null);
    void Promise.resolve(
      supabase
        .from('profiles')
        .select('display_name,email,college,batch_id,medium')
        .eq('id', uid)
        .maybeSingle(),
    )
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(err);
          return;
        }
        if (!data) {
          setProfile(null);
          return;
        }
        const row = data as Record<string, string | null>;
        setProfile({
          displayName: (row.display_name as string) ?? '',
          email: (row.email as string) ?? '',
          college: (row.college as string) ?? '',
          batchId: (row.batch_id as string) ?? null,
          medium: (row.medium as Profile['medium']) ?? null,
        });
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason : new Error('Profile request failed'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid]);
  return { profile, loading, error };
}
