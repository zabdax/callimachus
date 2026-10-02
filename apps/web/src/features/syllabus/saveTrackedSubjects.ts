import { supabase } from '@/lib/supabase/client';

export async function saveTrackedSubjects(uid: string, subjectIds: string[]) {
  const { error } = await supabase
    .from('tracked_subjects')
    .upsert({ uid, subject_ids: subjectIds }, { onConflict: 'uid' });
  if (error) throw error;
}
