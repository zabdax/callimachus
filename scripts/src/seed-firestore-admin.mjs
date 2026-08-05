// Seeds /batches and /syllabus using Firebase Admin SDK (bypasses rules).
// Uses GOOGLE_APPLICATION_CREDENTIALS env var to locate the SA JSON.
//
// Usage:
//   set GOOGLE_APPLICATION_CREDENTIALS=C:\Users\MIT\.config\hsc-tracker\sa.json
//   set FIREBASE_PROJECT_ID=hsc-tracker-ef2b5
//   node scripts/src/seed-firestore-admin.mjs

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!credPath || !projectId) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID must be set');
  process.exit(1);
}

// Parse the SA JSON to an object — cert() accepts either a path string or
// an object, and passing the raw string would make it try to read again.
const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;

const BATCH_SEED = [
  { id: 'HSC-2024', label: 'HSC 2024', collegeStart: '2023-07-15', examStart: '2024-06-30', examEnd: '2024-08-15', resultDate: '2024-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2025', label: 'HSC 2025', collegeStart: '2024-07-15', examStart: '2025-06-30', examEnd: '2025-08-15', resultDate: '2025-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2026', label: 'HSC 2026', collegeStart: '2025-07-15', examStart: '2026-06-30', examEnd: '2026-08-15', resultDate: '2026-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2027', label: 'HSC 2027', collegeStart: '2026-07-15', examStart: '2027-06-30', examEnd: '2027-08-15', resultDate: '2027-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2028', label: 'HSC 2028', collegeStart: '2027-07-15', examStart: '2028-06-30', examEnd: '2028-08-15', resultDate: '2028-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2029', label: 'HSC 2029', collegeStart: '2028-07-15', examStart: '2029-06-30', examEnd: '2029-08-15', resultDate: '2029-10-15', medium: 'both', isPublic: true },
  { id: 'HSC-2030', label: 'HSC 2030', collegeStart: '2029-07-15', examStart: '2030-06-30', examEnd: '2030-08-15', resultDate: '2030-10-15', medium: 'both', isPublic: true },
];

const SUBJECTS = [
  'physics1', 'physics2', 'chem1', 'chem2',
  'biology1', 'biology2', 'hmath1', 'hmath2',
  'bangla1', 'bangla2', 'eng1', 'eng2', 'ict',
];

const at = (s) => Timestamp.fromDate(new Date(s));

// === /batches ===
for (const b of BATCH_SEED) {
  await db.collection('batches').doc(b.id).set({
    label: b.label,
    collegeStart: at(b.collegeStart),
    examStart: at(b.examStart),
    examEnd: at(b.examEnd),
    resultDate: at(b.resultDate),
    medium: b.medium,
    isPublic: b.isPublic,
    status: 'pre-start',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
  console.log(`batches/${b.id} ✓`);
}

// === /syllabus/bangla + /syllabus/english ===
// Each subject gets a doc with empty chapters array — the syllabus
// detail is authored later via the actual syllabus data file. For now
// we just stub the 13 subjects so the schema is populated.
for (const medium of ['bangla', 'english']) {
  for (const subject of SUBJECTS) {
    await db.collection('syllabus').doc(medium).collection('subjects').doc(subject).set({
      subject,
      medium,
      chapters: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }
  console.log(`syllabus/${medium}/* ✓`);
}

console.log('Seeding complete.');
process.exit(0);
