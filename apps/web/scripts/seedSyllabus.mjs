import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { SUBJECT_SEED } from '../src/features/syllabus/seedData.bangla.ts';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

for (const s of SUBJECT_SEED) {
  await setDoc(doc(db, `syllabus/board/bangla/${s.subjectId}`), {
    name: s.subjectName,
    chapters: s.chapters,
    updatedAt: Timestamp.now(),
  });
  console.log(`Seeded syllabus/bangla/${s.subjectId}`);
}
