import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type TaskType = 'firstRevision' | 'secondRevision' | 'thirdRevision' | 'custom';
export type TaskSource = 'manual' | 'auto-sr';
export type TaskStatus = 'pending' | 'done' | 'skipped';

export type UpcomingTask = {
  id: string;
  uid: string;
  subjectId: string;
  subjectName?: string;
  chapterId?: string;
  chapterName?: string;
  type: TaskType;
  source: TaskSource;
  status: TaskStatus;
  scheduledFor: Date;
  createdAt: Date;
  resolvedAt?: Date | null;
};

type Raw = Omit<UpcomingTask, 'scheduledFor' | 'createdAt' | 'resolvedAt'> & {
  scheduledFor: { toDate: () => Date } | Date;
  createdAt: { toDate: () => Date } | Date;
  resolvedAt?: { toDate: () => Date } | Date | null;
};

export function normalizeTask(raw: Raw): UpcomingTask {
  return {
    ...raw,
    scheduledFor:
      raw.scheduledFor instanceof Date ? raw.scheduledFor : raw.scheduledFor.toDate(),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt : raw.createdAt.toDate(),
    resolvedAt: raw.resolvedAt
      ? raw.resolvedAt instanceof Date
        ? raw.resolvedAt
        : raw.resolvedAt.toDate()
      : null,
  };
}

export async function listUpcomingTasks(uid: string): Promise<UpcomingTask[]> {
  const db = getFirestore(app);
  const q = query(collection(db, `users/${uid}/upcomingTasks`), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    normalizeTask({ id: d.id, uid, ...(d.data() as Omit<Raw, 'id' | 'uid'>) }),
  );
}

export async function addManualTask(
  uid: string,
  t: Partial<UpcomingTask> & { subjectId: string; chapterId: string },
) {
  const db = getFirestore(app);
  return addDoc(collection(db, `users/${uid}/upcomingTasks`), {
    ...t,
    source: 'manual',
    status: 'pending',
    createdAt: serverTimestamp(),
    scheduledFor: t.scheduledFor ?? serverTimestamp(),
  });
}

export async function completeUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), {
    status: 'done',
    resolvedAt: serverTimestamp(),
  });
}

export async function skipUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), {
    status: 'skipped',
    resolvedAt: serverTimestamp(),
  });
}

export async function setUpcomingTask(uid: string, taskId: string, data: Partial<UpcomingTask>) {
  const db = getFirestore(app);
  await setDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`), data, { merge: true });
}

export async function deleteUpcomingTask(uid: string, taskId: string) {
  const db = getFirestore(app);
  await deleteDoc(doc(db, `users/${uid}/upcomingTasks/${taskId}`));
}