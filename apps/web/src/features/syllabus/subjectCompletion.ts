import type { ChaptersMap, ChapterKey } from './types';

export function subjectCompletion(chapters: ChaptersMap) {
  const keys = Object.keys(chapters) as ChapterKey[];
  const total = keys.length || 1;
  const count = (k: keyof ChaptersMap[string]) =>
    keys.reduce((n, c) => n + (chapters[c]?.[k] ? 1 : 0), 0);
  const pct = (n: number) => Math.round((n / total) * 100);
  return {
    firstStudy: pct(count('firstStudy')),
    firstRevision: pct(count('firstRevision')),
    secondRevision: pct(count('secondRevision')),
    thirdRevision: pct(count('thirdRevision')),
  };
}
