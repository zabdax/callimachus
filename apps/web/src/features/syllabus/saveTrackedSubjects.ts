import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export async function saveTrackedSubjects(uid: string, subjectIds: string[]) {
  const db = getFirestore(app);
  await setDoc(doc(db, `users/${uid}/meta/trackedSubjects`), {
    subjectIds,
    updatedAt: Timestamp.now(),
  });
}
