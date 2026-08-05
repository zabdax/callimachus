// 1. Set a temporary password on the existing admin user.
// 2. Write /users/<uid> doc with operator profile.
// 3. Write /admins/<uid> doc.
// 4. Set admin custom claim.
//
// Run: node scripts/bootstrap-operator.mjs
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const SA_PATH = 'C:/Users/MIT/.config/hsc-tracker/sa.json';
const PROJECT_ID = 'hsc-tracker-ef2b5';
const OPERATOR_EMAIL = 'byzubooo@gmail.com';
const OPERATOR_UID = '82WzpnRHHVh6ptyO1pKJZTJhnGo2';
const TEMP_PASSWORD = 'operator-2026-temp';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;
const auth = admin.auth();

// 1. Set temporary password (or update email/password)
await auth.updateUser(OPERATOR_UID, { password: TEMP_PASSWORD });
console.log(`Set temporary password on ${OPERATOR_EMAIL}: ${TEMP_PASSWORD}`);

// 2. Set admin custom claim
await auth.setCustomUserClaims(OPERATOR_UID, { admin: true });
console.log(`Set admin=true custom claim on ${OPERATOR_UID}`);

// 3. Write /admins/<uid>
await db.collection('admins').doc(OPERATOR_UID).set({
  uid: OPERATOR_UID,
  email: OPERATOR_EMAIL,
  role: 'admin',
  createdAt: Timestamp.now(),
});
console.log(`Created /admins/${OPERATOR_UID}`);

// 4. Write /users/<uid> (seed onboarding data so the UI skips onboarding)
await db.collection('users').doc(OPERATOR_UID).set({
  uid: OPERATOR_UID,
  email: OPERATOR_EMAIL,
  displayName: 'Operator',
  college: 'HSC Tracker Admin',
  batchId: 'HSC-2026',
  medium: 'bangla',
  timezone: 'Asia/Dhaka',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}, { merge: true });
console.log(`Created /users/${OPERATOR_UID} (HSC-2026, Bangla Medium, college=HSC Tracker Admin)`);

console.log('\n=== OPERATOR LOGIN ===');
console.log(`Email: ${OPERATOR_EMAIL}`);
console.log(`Password: ${TEMP_PASSWORD}`);
console.log('========================');
console.log('\nNext: go to https://hsc-tracker.pages.dev/sign-in and use the above.');
console.log('The /sign-in page will need an email/password form added (it currently has only Google sign-in).');

process.exit(0);