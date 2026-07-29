import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { BATCH_SEED } from '../src/features/batches/seedData.ts';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(config);
const db = getFirestore(app);

for (const b of BATCH_SEED) {
  await setDoc(doc(db, 'batches', b.id), {
    label: b.label,
    collegeStart: Timestamp.fromDate(b.collegeStart),
    examStart: Timestamp.fromDate(b.examStart),
    examEnd: Timestamp.fromDate(b.examEnd),
    resultDate: Timestamp.fromDate(b.resultDate),
    medium: b.medium,
    isPublic: b.isPublic,
    status: 'pre-start', // recomputeBatchStatus cron will fix
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log(`Seeded ${b.id}`);
}
