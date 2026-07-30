export type ChapterState = {
  firstStudy: boolean;
  firstStudyDate?: Date | null;
  firstRevision: boolean;
  firstRevisionDate?: Date | null;
  secondRevision: boolean;
  secondRevisionDate?: Date | null;
  thirdRevision: boolean;
  thirdRevisionDate?: Date | null;
};

export type ChapterKey = string;
export type ChaptersMap = Record<ChapterKey, ChapterState>;

export type SubjectDoc = {
  subjectId: string;
  subjectName: string;
  chapters: { id: string; name: string; tags?: string[] }[];
};
