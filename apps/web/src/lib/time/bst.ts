import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export type Segment = { date: string /* YYYY-MM-DD in tz */; startMs: number; endMs: number; durationSec: number };

function dateKey(ms: number, tz: string): string {
  return formatInTimeZone(new Date(ms), tz, 'yyyy-MM-dd');
}

function tzMidnightMs(dateKey: string, tz: string): number {
  // Build a Date that represents local midnight in `tz`, then convert to UTC ms.
  const local = fromZonedTime(`${dateKey} 00:00:00`, tz);
  return local.getTime();
}

export function splitByLocalMidnight(startMs: number, endMs: number, tz: string): Segment[] {
  if (endMs <= startMs) return [];
  const startKey = dateKey(startMs, tz);
  const endKey = dateKey(endMs, tz);
  if (startKey === endKey) {
    return [{ date: startKey, startMs, endMs, durationSec: Math.floor((endMs - startMs) / 1000) }];
  }
  const out: Segment[] = [];
  out.push({ date: startKey, startMs, endMs: tzMidnightMs(nextDateKey(startKey), tz), durationSec: 0 });
  const first = out[0]!;
  first.durationSec = Math.floor((first.endMs - first.startMs) / 1000);
  // Day(s) in between (rare for sessions < 6h; possible for offline replay)
  let cursor = nextDateKey(startKey);
  while (cursor < endKey) {
    out.push({ date: cursor, startMs: tzMidnightMs(cursor, tz), endMs: tzMidnightMs(nextDateKey(cursor), tz), durationSec: 86400 });
    cursor = nextDateKey(cursor);
  }
  out.push({ date: endKey, startMs: tzMidnightMs(endKey, tz), endMs, durationSec: Math.floor((endMs - tzMidnightMs(endKey, tz)) / 1000) });
  return out;
}

function nextDateKey(k: string): string {
  const [y, m, d] = k.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
