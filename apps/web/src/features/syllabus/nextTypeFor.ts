import type { ChapterState } from './types';

export type Stage = 'firstStudy' | 'firstRevision' | 'secondRevision' | 'thirdRevision';
const ORDER: Stage[] = ['firstStudy', 'firstRevision', 'secondRevision', 'thirdRevision'];

export function nextTypeFor(chapter: ChapterState): Stage | null {
  for (const s of ORDER) if (!chapter[s]) return s;
  return null;
}
