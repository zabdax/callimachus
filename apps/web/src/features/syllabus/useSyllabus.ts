import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { loadAllSyllabus } from './loadAllSyllabus';
import type { ChapterState } from './types';
import type { Stage } from './nextTypeFor';

export function useSyllabus(uid: string, medium: 'bangla' | 'english') {
  const qc = useQueryClient();
  const key = ['syllabus', uid, medium] as const;
  const { data, isLoading: loading, error } = useQuery({
    queryKey: key,
    queryFn: () => loadAllSyllabus(uid, medium),
    enabled: !!uid,
  });

  const toggle = useMutation({
    mutationFn: async (args: { subjectId: string; chapterId: string; stage: Stage }) => {
      // Read-modify-write of the subject's chapters map. Two quick toggles
      // (or two tabs) last-write-wins; the query invalidation right after
      // keeps the UI consistent.
      const { data: row, error: readError } = await supabase
        .from('syllabus_progress')
        .select('chapters')
        .eq('uid', uid)
        .eq('subject_id', args.subjectId)
        .maybeSingle();
      if (readError) throw readError;
      const stored = (row?.chapters as Record<string, ChapterState> | undefined) ?? {};
      const prev = stored[args.chapterId];
      const next: ChapterState = {
        firstStudy: false,
        firstRevision: false,
        secondRevision: false,
        thirdRevision: false,
      };
      if (prev) Object.assign(next, prev);
      next[args.stage] = !prev?.[args.stage];
      (next as Record<string, unknown>)[`${args.stage}Date`] = next[args.stage]
        ? new Date().toISOString()
        : null;
      const { error: writeError } = await supabase.from('syllabus_progress').upsert(
        {
          uid,
          subject_id: args.subjectId,
          chapters: { ...stored, [args.chapterId]: next },
        },
        { onConflict: 'uid,subject_id' },
      );
      if (writeError) throw writeError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    subjects: data?.subjects ?? [],
    chapters: data?.chapters ?? {},
    loading,
    error,
    toggle: toggle.mutateAsync,
    isSaving: toggle.isPending,
  };
}
