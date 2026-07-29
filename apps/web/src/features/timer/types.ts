export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerState = {
  status: TimerStatus;
  startTs: number | null;
  pausedAccumMs: number;
  pausedAt: number | null;
};
