export type Anchor = { startTs: number; pausedAccumMs: number };

export function elapsedMs(a: Anchor, nowMs: number): number {
  return Math.max(0, (nowMs - a.startTs) - a.pausedAccumMs);
}
