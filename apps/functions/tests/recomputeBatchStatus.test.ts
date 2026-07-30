import { describe, it, expect } from 'vitest';
import { recomputeBatchStatus, type BatchDates } from '../src/recomputeBatchStatus';

const b: BatchDates = {
  collegeStart: new Date('2025-07-15T00:00:00+06:00'),
  examStart: new Date('2026-06-30T00:00:00+06:00'),
  examEnd: new Date('2026-08-15T00:00:00+06:00'),
};

describe('functions:recomputeBatchStatus', () => {
  it('maps the four windows correctly', () => {
    expect(recomputeBatchStatus(b, new Date('2025-01-01T00:00:00+06:00'))).toBe('pre-start');
    expect(recomputeBatchStatus(b, new Date('2025-12-01T00:00:00+06:00'))).toBe('in-session');
    expect(recomputeBatchStatus(b, new Date('2026-07-15T00:00:00+06:00'))).toBe('exam-window');
    expect(recomputeBatchStatus(b, new Date('2026-09-01T00:00:00+06:00'))).toBe('resulted');
  });
});
