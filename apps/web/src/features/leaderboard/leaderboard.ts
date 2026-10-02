import { supabase } from '@/lib/supabase/client';

export type LbUser = { uid: string; durationSec: number; name?: string; photoURL?: string; college?: string };

export const RANK_GATE_SEC = 15 * 60;

export function sortTop10(users: LbUser[]): LbUser[] {
  return [...users].sort((a, b) => b.durationSec - a.durationSec).slice(0, 10);
}
export function isRankUnlocked(todaySec: number): boolean {
  return todaySec >= RANK_GATE_SEC;
}

/**
 * Reads the aggregate daily leaderboard row written by the Workers cron.
 * Per-user rows are readable only by the owning user and admins (privacy),
 * so client-side top-N listing is not possible — a future leaderboard UI
 * should be served aggregates from the Worker.
 */
export async function readDailyLeaderboard(date: string) {
  const { data, error } = await supabase
    .from('leaderboard_daily')
    .select('total_duration_sec,active_user_count')
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return {
    date,
    totalDurationSec: (data?.total_duration_sec as number) ?? 0,
    activeUserCount: (data?.active_user_count as number) ?? 0,
  };
}

export async function readMonthlyLeaderboard(month: string) {
  const { data, error } = await supabase
    .from('leaderboard_monthly')
    .select('total_duration_sec,active_user_count')
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return {
    month,
    totalDurationSec: (data?.total_duration_sec as number) ?? 0,
    activeUserCount: (data?.active_user_count as number) ?? 0,
  };
}
