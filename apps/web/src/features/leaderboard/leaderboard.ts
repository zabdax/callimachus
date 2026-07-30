import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type LbUser = { uid: string; durationSec: number; name?: string; photoURL?: string; college?: string };

export const RANK_GATE_SEC = 15 * 60;

export function sortTop10(users: LbUser[]): LbUser[] {
  return [...users].sort((a, b) => b.durationSec - a.durationSec).slice(0, 10);
}
export function isRankUnlocked(todaySec: number): boolean {
  return todaySec >= RANK_GATE_SEC;
}

export async function readDailyLeaderboard(date: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard_daily/${date}`));
  if (!docSnap.exists()) return { date, totalDurationSec: 0, users: [] as LbUser[] };
  const data = docSnap.data() as { totalDurationSec: number; users: Record<string, number> };
  const users = Object.entries(data.users ?? {}).map(([uid, durationSec]) => ({ uid, durationSec }));
  return { date, totalDurationSec: data.totalDurationSec ?? 0, users };
}

export async function readMonthlyLeaderboard(month: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard_monthly/${month}`));
  if (!docSnap.exists()) return { month, users: [] as LbUser[] };
  const data = docSnap.data() as { users: Record<string, number> };
  return { month, users: Object.entries(data.users ?? {}).map(([uid, durationSec]) => ({ uid, durationSec })) };
}
