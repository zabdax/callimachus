import { describe, it, expect } from 'vitest';
import { subjectCompletion } from '@/features/syllabus/subjectCompletion';

describe('subjectCompletion', () => {
  it('returns 0% for empty chapters', () => {
    expect(subjectCompletion({})).toEqual({
      firstStudy: 0,
      firstRevision: 0,
      secondRevision: 0,
      thirdRevision: 0,
    });
  });
  it('returns 100% for fully completed chapters', () => {
    const chapters = {
      c1: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
      c2: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
    };
    expect(subjectCompletion(chapters)).toEqual({
      firstStudy: 100,
      firstRevision: 100,
      secondRevision: 100,
      thirdRevision: 100,
    });
  });
  it('returns 50% for half-completed chapters (per stage)', () => {
    const chapters = {
      c1: { firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true },
      c2: { firstStudy: true, firstRevision: false, secondRevision: false, thirdRevision: false },
    };
    expect(subjectCompletion(chapters)).toEqual({
      firstStudy: 100,
      firstRevision: 50,
      secondRevision: 50,
      thirdRevision: 50,
    });
  });
});
