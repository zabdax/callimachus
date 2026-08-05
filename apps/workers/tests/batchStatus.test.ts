import { describe, it, expect } from 'vitest';
import { recomputeBatchStatus } from '../src/handlers/batchStatus';

const DAY = 86_400_000;

describe('recomputeBatchStatus', () => {
  it('returns pre-start when now < collegeStart', () => {
    const out = recomputeBatchStatus(0, DAY * 30, DAY * 365, DAY * 400);
    expect(out.kind).toBe('pre-start');
    if (out.kind === 'pre-start') expect(out.daysToStart).toBe(30);
  });

  it('returns in-session when collegeStart <= now < examStart', () => {
    const out = recomputeBatchStatus(DAY * 200, DAY * 30, DAY * 365, DAY * 400);
    expect(out.kind).toBe('in-session');
    if (out.kind === 'in-session') expect(out.daysToExam).toBe(165);
  });

  it('returns exam-window when examStart <= now <= examEnd', () => {
    const out = recomputeBatchStatus(DAY * 380, DAY * 30, DAY * 365, DAY * 400);
    expect(out.kind).toBe('exam-window');
  });

  it('returns resulted when now > examEnd', () => {
    const out = recomputeBatchStatus(DAY * 500, DAY * 30, DAY * 365, DAY * 400);
    expect(out.kind).toBe('resulted');
  });
});