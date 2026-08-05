import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
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
      const db = getFirestore(app);
      const ref = doc(db, `users/${uid}/syllabus/${args.subjectId}`);
      const next: ChapterState = {
        firstStudy: false,
        firstRevision: false,
        secondRevision: false,
        thirdRevision: false,
      };
      const prev = data?.chapters[args.subjectId]?.[args.chapterId];
      if (prev) Object.assign(next, prev);
      next[args.stage] = !prev?.[args.stage];
      (next as Record<string, unknown>)[`${args.stage}Date`] = next[args.stage]
        ? Timestamp.now()
        : null;
      await setDoc(ref, { chapters: { [args.chapterId]: next } }, { merge: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    subjects: data?.subjects ?? [],
    chapters: data?.chapters ?? {},
    loading,
    error,
    toggle: toggle.mutateAsync,
  };
}