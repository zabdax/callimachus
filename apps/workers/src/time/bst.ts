export type Segment = {
  date: string; // YYYY-MM-DD in tz
  startMs: number;
  endMs: number;
  durationSec: number;
};

/**
 * Splits [startMs, endMs] into segments that each lie entirely within a
 * single calendar day in `tz`. The last segment may cross midnight; the
 * function emits one segment per local-date boundary touched.
 *
 * No external timezone lib (Workers V8 isolates have none). We use Intl
 * to format dates and a manual offset computation to find local midnight.
 */
export function splitByLocalMidnight(
  startMs: number,
  endMs: number,
  tz: string,
): Segment[] {
  if (endMs <= startMs) return [];
  const out: Segment[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const date = localDateKey(cursor, tz);
    const nextMidnight = localMidnightMs(addDays(date, 1), tz);
    const segEnd = Math.min(endMs, nextMidnight);
    out.push({
      date,
      startMs: cursor,
      endMs: segEnd,
      durationSec: Math.floor((segEnd - cursor) / 1000),
    });
    cursor = segEnd;
  }
  return out;
}

/** Returns YYYY-MM-DD for the given UTC ms in the given IANA timezone. */
export function localDateKey(ms: number, tz: string): string {
  // Intl.DateTimeFormat with the requested timezone, then format parts.
  // Works on every modern runtime — no extra deps needed.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(ms));
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/**
 * Returns the UTC ms for local-midnight of the given dateKey in tz.
 * Computed via a bisection search over a 24-hour window.
 */
function localMidnightMs(dateKey: string, tz: string): number {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`invalid dateKey: ${dateKey}`);
  }
  // Estimate midnight UTC (most zones are within ±14h of UTC).
  let lo = Date.UTC(y, m - 1, d, 0, 0, 0) - 14 * 3600_000;
  let hi = lo + 28 * 3600_000;
  // Bisect: find the UTC ms whose local-date-key in tz equals dateKey.
  for (let i = 0; i < 32; i++) {
    const mid = Math.floor((lo + hi) / 2 / 60_000) * 60_000;
    const k = localDateKey(mid, tz);
    if (k === dateKey) {
      // Refine: find the lowest ms with this key.
      let left = lo;
      let right = mid;
      for (let j = 0; j < 16; j++) {
        const m2 = Math.floor((left + right) / 2 / 60_000) * 60_000;
        if (localDateKey(m2, tz) === dateKey) right = m2;
        else left = m2;
      }
      return right;
    }
    if (k < dateKey) lo = mid;
    else hi = mid;
  }
  // Fallback: shouldn't happen for any valid IANA tz
  return Date.UTC(y as number, (m as number) - 1, d as number, 0, 0, 0);
}

function addDays(dateKey: string, days: number): string {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`invalid dateKey: ${dateKey}`);
  }
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(dt.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}