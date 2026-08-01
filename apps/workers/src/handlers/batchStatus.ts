/**
 * Maps an Asia/Dhaka "05:00" cron to UTC. Dhaka is UTC+6 (no DST),
 * so 05:00 Dhaka = 23:00 UTC the previous day.
 */
export const DAILY_PLAN_CRON = '0 23 * * *'; // 05:00 Asia/Dhaka

export const HOURLY_CRON = '0 * * * *';
export const DAILY_MIDNIGHT_CRON = '0 0 * * *';
export const NONCE_AND_REMINDER_CRON = '30 * * * *'; // both run at :30

export type BatchState =
  | { kind: 'pre-start'; daysToStart: number }
  | { kind: 'in-session'; daysToExam: number }
  | { kind: 'exam-window' }
  | { kind: 'resulted' };

/**
 * Pure: given a batch's collegeStart + examStart + examEnd, compute
 * which phase it's in right now. Mirrors the apps/functions/recompute
 * BatchStatus logic 1:1.
 */
export function recomputeBatchStatus(
  now: number,
  collegeStart: number,
  examStart: number,
  examEnd: number,
): BatchState {
  if (now < collegeStart) {
    return { kind: 'pre-start', daysToStart: Math.ceil((collegeStart - now) / 86_400_000) };
  }
  if (now < examStart) {
    return { kind: 'in-session', daysToExam: Math.ceil((examStart - now) / 86_400_000) };
  }
  if (now <= examEnd) {
    return { kind: 'exam-window' };
  }
  return { kind: 'resulted' };
}