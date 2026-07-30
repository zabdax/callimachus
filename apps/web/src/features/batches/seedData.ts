import type { BatchDates } from './recomputeBatchStatus';

export type BatchSeed = BatchDates & {
  id: string;
  label: string;
  resultDate: Date;
  medium: 'bangla' | 'english' | 'both';
  isPublic: boolean;
};

/**
 * PLACEHOLDER dates. Admin must verify against Bangladesh Education Board
 * schedule before public launch. See design spec §9.4.
 */
export const BATCH_SEED: BatchSeed[] = [
  {
    id: 'HSC-2024',
    label: 'HSC 2024',
    collegeStart: new Date('2023-07-15T00:00:00+06:00'),
    examStart: new Date('2024-06-30T00:00:00+06:00'),
    examEnd: new Date('2024-08-15T00:00:00+06:00'),
    resultDate: new Date('2024-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2025',
    label: 'HSC 2025',
    collegeStart: new Date('2024-07-15T00:00:00+06:00'),
    examStart: new Date('2025-06-30T00:00:00+06:00'),
    examEnd: new Date('2025-08-15T00:00:00+06:00'),
    resultDate: new Date('2025-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2026',
    label: 'HSC 2026',
    collegeStart: new Date('2025-07-15T00:00:00+06:00'),
    examStart: new Date('2026-06-30T00:00:00+06:00'),
    examEnd: new Date('2026-08-15T00:00:00+06:00'),
    resultDate: new Date('2026-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2027',
    label: 'HSC 2027',
    collegeStart: new Date('2026-07-15T00:00:00+06:00'),
    examStart: new Date('2027-06-30T00:00:00+06:00'),
    examEnd: new Date('2027-08-15T00:00:00+06:00'),
    resultDate: new Date('2027-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2028',
    label: 'HSC 2028',
    collegeStart: new Date('2027-07-15T00:00:00+06:00'),
    examStart: new Date('2028-06-30T00:00:00+06:00'),
    examEnd: new Date('2028-08-15T00:00:00+06:00'),
    resultDate: new Date('2028-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2029',
    label: 'HSC 2029',
    collegeStart: new Date('2028-07-15T00:00:00+06:00'),
    examStart: new Date('2029-06-30T00:00:00+06:00'),
    examEnd: new Date('2029-08-15T00:00:00+06:00'),
    resultDate: new Date('2029-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
  {
    id: 'HSC-2030',
    label: 'HSC 2030',
    collegeStart: new Date('2029-07-15T00:00:00+06:00'),
    examStart: new Date('2030-06-30T00:00:00+06:00'),
    examEnd: new Date('2030-08-15T00:00:00+06:00'),
    resultDate: new Date('2030-10-15T00:00:00+06:00'),
    medium: 'both',
    isPublic: true,
  },
];
