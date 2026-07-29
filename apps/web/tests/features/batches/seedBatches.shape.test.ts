import { describe, it, expect } from 'vitest';
import { BATCH_SEED } from '@/features/batches/seedData';

describe('BATCH_SEED shape', () => {
  it('contains exactly HSC-2024 through HSC-2030', () => {
    const ids = BATCH_SEED.map((b) => b.id).sort();
    expect(ids).toEqual([
      'HSC-2024',
      'HSC-2025',
      'HSC-2026',
      'HSC-2027',
      'HSC-2028',
      'HSC-2029',
      'HSC-2030',
    ]);
  });

  it('every batch has collegeStart < examStart < examEnd', () => {
    for (const b of BATCH_SEED) {
      expect(b.collegeStart.getTime()).toBeLessThan(b.examStart.getTime());
      expect(b.examStart.getTime()).toBeLessThan(b.examEnd.getTime());
    }
  });
});
