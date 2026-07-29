import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type AnchorRecord = { startTs: number; pausedAccumMs: number; serverStartTs: number };

const LS_KEY = (uid: string) => `hsc:timer:${uid}`;

export function saveAnchor(uid: string, a: AnchorRecord) {
  localStorage.setItem(LS_KEY(uid), JSON.stringify(a));
  void setDoc(doc(getFirestore(app), `users/${uid}/activeSession/current`), {
    ...a, updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function loadAnchor(uid: string): AnchorRecord | null {
  const raw = localStorage.getItem(LS_KEY(uid));
  if (!raw) return null;
  try { return JSON.parse(raw) as AnchorRecord; } catch { return null; }
}

export function clearAnchor(uid: string) {
  localStorage.removeItem(LS_KEY(uid));
  void setDoc(doc(getFirestore(app), `users/${uid}/activeSession/current`), {
    startTs: null, pausedAccumMs: 0, serverStartTs: null, clearedAt: serverTimestamp(),
  }, { merge: true });
}
