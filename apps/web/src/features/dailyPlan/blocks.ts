import {
  addDoc, collection, doc, getDocs, getFirestore, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type TimeBlock = {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD in Asia/Dhaka
  startHour: number; // 0..23
  durationMin: number;
  subjectId: string;
  chapterId: string;
  completedAt: Date | null;
  source: 'manual' | 'auto-plan';
};

export function hasConflict(blocks: TimeBlock[], candidate: TimeBlock): boolean {
  const cStart = candidate.startHour * 60;
  const cEnd = cStart + candidate.durationMin;
  return blocks.some((b) => {
    if (b.completedAt) return false;
    if (b.date !== candidate.date) return false;
    const s = b.startHour * 60;
    const e = s + b.durationMin;
    return s < cEnd && cStart < e;
  });
}

export async function listTimeBlocks(uid: string, date: string) {
  const db = getFirestore(app);
  const q = query(collection(db, `users/${uid}/meta/timeBlocks`), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, uid, ...(d.data() as Omit<TimeBlock, 'id' | 'uid'>) })) as TimeBlock[];
}

export async function addBlock(uid: string, b: Omit<TimeBlock, 'id' | 'uid' | 'completedAt'>) {
  const db = getFirestore(app);
  return addDoc(collection(db, `users/${uid}/meta/timeBlocks`), { ...b, completedAt: null, createdAt: serverTimestamp() });
}

export async function completeBlock(uid: string, id: string) {
  const db = getFirestore(app);
  await updateDoc(doc(db, `users/${uid}/meta/timeBlocks/${id}`), { completedAt: serverTimestamp() });
}
