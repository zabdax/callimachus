export type BatchStatus = 'pre-start' | 'in-session' | 'exam-window' | 'resulted';

export type BatchDates = {
  collegeStart: Date;
  examStart: Date;
  examEnd: Date;
};

export function recomputeBatchStatus(batch: BatchDates, now: Date): BatchStatus {
  if (now < batch.collegeStart) return 'pre-start';
  if (now < batch.examStart) return 'in-session';
  if (now <= batch.examEnd) return 'exam-window';
  return 'resulted';
}
