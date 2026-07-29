import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { ChaptersMap, SubjectDoc } from './types';

export type SyllabusLoad = {
  subjects: SubjectDoc[];
  chapters: Record<string, SubjectDoc['subjectId'] extends string ? string : never, ChaptersMap>;
};

/** Loads all `/syllabus/board/{medium}` docs and the user's per-subject progress. */
export async function loadAllSyllabus(
  uid: string,
  medium: 'bangla' | 'english',
): Promise<{ subjects: SubjectDoc[]; chapters: Record<string, ChaptersMap> }> {
  const db = getFirestore(app);
  const subjectsSnap = await getDocs(collection(db, `syllabus/board/${medium}`));
  const subjects: SubjectDoc[] = subjectsSnap.docs.map((d) => ({
    subjectId: d.id,
    ...(d.data() as Omit<SubjectDoc, 'subjectId'>),
  }));

  const chapters: Record<string, ChaptersMap> = {};
  for (const s of subjects) {
    const userSyll = await getDoc(doc(db, `users/${uid}/syllabus/${s.subjectId}`));
    chapters[s.subjectId] = userSyll.exists() ? (userSyll.data() as ChaptersMap) : {};
  }
  return { subjects, chapters };
}
