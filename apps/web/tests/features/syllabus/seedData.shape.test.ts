import { describe, it, expect } from 'vitest';
import { SUBJECT_SEED } from '@/features/syllabus/seedData.bangla';

describe('SUBJECT_SEED (Bangla medium)', () => {
  it('includes physics1', () => {
    const p1 = SUBJECT_SEED.find((s) => s.subjectId === 'physics1');
    expect(p1).toBeDefined();
    expect(p1!.chapters.length).toBeGreaterThanOrEqual(8);
    expect(p1!.chapters.length).toBeLessThanOrEqual(20);
  });
  it('chapter ids are unique', () => {
    for (const s of SUBJECT_SEED) {
      const ids = s.chapters.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
