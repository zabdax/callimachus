import { supabase } from '@/lib/supabase/client';
import type { ChaptersMap, SubjectDoc } from './types';

export type SyllabusLoad = {
  subjects: SubjectDoc[];
  chapters: Record<string, ChaptersMap>;
};

/** Loads the static curriculum for a medium plus the user's per-subject progress. */
export async function loadAllSyllabus(
  uid: string,
  medium: 'bangla' | 'english',
): Promise<{ subjects: SubjectDoc[]; chapters: Record<string, ChaptersMap> }> {
  const { data: subjectsRows, error: subjectsError } = await supabase
    .from('curriculum')
    .select('subject_id,title,chapters')
    .eq('medium', medium);
  if (subjectsError) throw subjectsError;

  const subjects: SubjectDoc[] = (subjectsRows ?? []).map((r) => ({
    subjectId: r.subject_id as string,
    subjectName: (r.title as string) ?? '',
    chapters: ((r.chapters as unknown) ?? []) as SubjectDoc['chapters'],
  }));

  const { data: progressRows, error: progressError } = await supabase
    .from('syllabus_progress')
    .select('subject_id,chapters')
    .eq('uid', uid);
  if (progressError) throw progressError;

  const chapters: Record<string, ChaptersMap> = {};
  for (const row of progressRows ?? []) {
    chapters[row.subject_id as string] = (row.chapters as ChaptersMap) ?? {};
  }
  return { subjects, chapters };
}
