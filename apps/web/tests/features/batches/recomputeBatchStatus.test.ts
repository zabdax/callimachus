import { describe, it, expect } from 'vitest';
import { recomputeBatchStatus, type BatchDates } from '@/features/batches/recomputeBatchStatus';

const baseBatch: BatchDates = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('recomputeBatchStatus', () => {
  it('is "pre-start" before collegeStart', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2025-01-01T00:00:00+06:00'))).toBe('pre-start');
  });

  it('is "in-session" between collegeStart and examStart', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2025-12-01T00:00:00+06:00'))).toBe('in-session');
  });

  it('is "exam-window" between examStart and examEnd (inclusive)', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2026-07-15T00:00:00+06:00'))).toBe('exam-window');
    expect(recomputeBatchStatus(baseBatch, new Date('2026-08-15T00:00:00+06:00'))).toBe('exam-window');
  });

  it('is "resulted" after examEnd', () => {
    expect(recomputeBatchStatus(baseBatch, new Date('2026-09-01T00:00:00+06:00'))).toBe('resulted');
  });
});
