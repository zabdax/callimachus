import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { loadAllSyllabus, type SyllabusLoad } from './loadAllSyllabus';
import type { ChapterState, Stage } from './nextTypeFor';

export function useSyllabus(uid: string, medium: 'bangla' | 'english') {
  const qc = useQueryClient();
  const key = ['syllabus', uid, medium] as const;
  const q = useQuery<SyllabusLoad>({
    queryKey: key,
    queryFn: () =>
      loadAllSyllabus(uid, medium).then((res) => ({
        subjects: res.subjects,
        chapters: res.chapters as SyllabusLoad['chapters'],
      })),
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
      const prev = q.data?.chapters[args.subjectId]?.[args.chapterId];
      if (prev) Object.assign(next, prev);
      next[args.stage] = !prev?.[args.stage];
      (next as Record<string, unknown>)[`${args.stage}Date`] = next[args.stage]
        ? Timestamp.now()
        : null;
      await setDoc(ref, { chapters: { [args.chapterId]: next } }, { merge: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...q, toggle: toggle.mutateAsync };
}
