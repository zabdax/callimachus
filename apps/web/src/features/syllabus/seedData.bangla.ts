import type { SubjectDoc } from './types';

/**
 * PLACEHOLDER Bangla-medium syllabus seed.
 * Plan 1 ships this one subject (Physics 1st Paper) as a worked example.
 * Remaining 12 subjects are added in a single follow-up task that mirrors
 * this shape. We re-type, we do not scrape.
 */
export const SUBJECT_SEED: SubjectDoc[] = [
  {
    subjectId: 'physics1',
    subjectName: 'পদার্থবিজ্ঞান ১ম পত্র',
    chapters: [
      { id: 'p1c01', name: 'ভৌত জগত ও পরিমাপ' },
      { id: 'p1c02', name: 'স্কেলার ও ভেক্টর' },
      { id: 'p1c03', name: 'গতি' },
      { id: 'p1c04', name: 'নিউটনের গতিসূত্র' },
      { id: 'p1c05', name: 'কাজ, ক্ষমতা ও শক্তি' },
      { id: 'p1c06', name: 'মহাকর্ষ ও অভিকর্ষ' },
      { id: 'p1c07', name: 'পদার্থের গাঠনিক ধর্ম' },
      { id: 'p1c08', name: 'পর্যায়বৃত্ত গতি' },
      { id: 'p1c09', name: 'তরঙ্গ' },
      { id: 'p1c10', name: 'আলোকবিজ্ঞান' },
    ],
  },
  // Plan 1 leaves physics2/chem1/.../ict for the follow-up fill-in task.
];
