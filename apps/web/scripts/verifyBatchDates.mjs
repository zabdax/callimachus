// Prints a checklist for the admin to confirm against Bangladesh Education Board.
import { BATCH_SEED } from '../src/features/batches/seedData.ts';

console.log('VERIFY THESE DATES against https://www.educationboard.gov.bd/');
for (const b of BATCH_SEED) {
  const college = b.collegeStart.toISOString().slice(0, 10);
  const examStart = b.examStart.toISOString().slice(0, 10);
  const examEnd = b.examEnd.toISOString().slice(0, 10);
  const result = b.resultDate.toISOString().slice(0, 10);
  console.log(`${b.id}: college=${college} exam=${examStart}–${examEnd} result=${result}`);
}
