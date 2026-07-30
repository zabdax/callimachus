export type ScheduledTask = {
  subjectId: string;
  chapterId: string;
  type: 'firstRevision' | 'secondRevision' | 'thirdRevision';
  scheduledFor: Date;
  source: 'auto-sr';
};

export function scheduleForFirstStudy(
  args: { subjectId: string; chapterId: string },
  firstStudyDate: Date,
): ScheduledTask[] {
  const day = 86400_000;
  return [
    {
      ...args,
      type: 'firstRevision',
      scheduledFor: new Date(firstStudyDate.getTime() + 7 * day),
      source: 'auto-sr',
    },
    {
      ...args,
      type: 'secondRevision',
      scheduledFor: new Date(firstStudyDate.getTime() + 14 * day),
      source: 'auto-sr',
    },
    {
      ...args,
      type: 'thirdRevision',
      scheduledFor: new Date(firstStudyDate.getTime() + 30 * day),
      source: 'auto-sr',
    },
  ];
}
