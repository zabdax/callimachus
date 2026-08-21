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

/**
 * Reads the aggregate daily leaderboard doc written by the Workers cron.
 * Per-user docs under `.../users` are readable only by the owning user and
 * admins (privacy), so client-side top-N listing is not possible — a
 * future leaderboard UI should be served aggregates from the Worker.
 */
export async function readDailyLeaderboard(date: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard/daily/${date}`));
  if (!docSnap.exists()) return { date, totalDurationSec: 0, activeUserCount: 0 };
  const data = docSnap.data() as { totalDurationSec?: number; activeUserCount?: number };
  return { date, totalDurationSec: data.totalDurationSec ?? 0, activeUserCount: data.activeUserCount ?? 0 };
}

export async function readMonthlyLeaderboard(month: string) {
  const db = getFirestore(app);
  const docSnap = await getDoc(doc(db, `analytics/leaderboard/monthly/${month}`));
  if (!docSnap.exists()) return { month, totalDurationSec: 0, activeUserCount: 0 };
  const data = docSnap.data() as { totalDurationSec?: number; activeUserCount?: number };
  return { month, totalDurationSec: data.totalDurationSec ?? 0, activeUserCount: data.activeUserCount ?? 0 };
}
