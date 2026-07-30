import { describe, it, expect } from 'vitest';
import { nextTypeFor } from '@/features/syllabus/nextTypeFor';

const ch = (
  over: Partial<{
    firstStudy: boolean;
    firstRevision: boolean;
    secondRevision: boolean;
    thirdRevision: boolean;
  }> = {},
) => ({
  firstStudy: false,
  firstRevision: false,
  secondRevision: false,
  thirdRevision: false,
  ...over,
});

describe('nextTypeFor', () => {
  it('returns firstStudy when nothing is done', () => {
    expect(nextTypeFor(ch())).toBe('firstStudy');
  });
  it('returns firstRevision after firstStudy', () => {
    expect(nextTypeFor(ch({ firstStudy: true }))).toBe('firstRevision');
  });
  it('returns secondRevision after firstRevision', () => {
    expect(nextTypeFor(ch({ firstStudy: true, firstRevision: true }))).toBe('secondRevision');
  });
  it('returns thirdRevision after secondRevision', () => {
    expect(
      nextTypeFor(ch({ firstStudy: true, firstRevision: true, secondRevision: true })),
    ).toBe('thirdRevision');
  });
  it('returns null after thirdRevision', () => {
    expect(
      nextTypeFor(
        ch({ firstStudy: true, firstRevision: true, secondRevision: true, thirdRevision: true }),
      ),
    ).toBeNull();
  });
});
