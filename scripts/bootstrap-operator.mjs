// Bootstraps the admin/operator account:
// 1. Sets a temporary password on the existing auth user.
// 2. Writes /users/<uid> doc with operator profile.
// 3. Writes /admins/<uid> doc.
// 4. Sets the admin custom claim.
//
// Every input comes from env — nothing sensitive is hardcoded here:
//   FIREBASE_PROJECT_ID  GCP project id
//   OPERATOR_EMAIL       operator email
//   OPERATOR_UID         operator auth uid
//   OPERATOR_PASSWORD    temporary password to set (rotate after first login)
//   OPERATOR_SA_PATH     optional path to the service-account JSON
//                        (default: ~/.config/hsc-tracker/sa.json)
//
// Run:
//   FIREBASE_PROJECT_ID=... OPERATOR_EMAIL=... OPERATOR_UID=... \
//   OPERATOR_PASSWORD=... node scripts/bootstrap-operator.mjs
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import admin from 'firebase-admin';

const SA_PATH = process.env.OPERATOR_SA_PATH ?? path.join(homedir(), '.config', 'hsc-tracker', 'sa.json');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL;
const OPERATOR_UID = process.env.OPERATOR_UID;
const TEMP_PASSWORD = process.env.OPERATOR_PASSWORD;

const missing = Object.entries({ FIREBASE_PROJECT_ID: PROJECT_ID, OPERATOR_EMAIL, OPERATOR_UID, OPERATOR_PASSWORD })
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;
const auth = admin.auth();

// 1. Set temporary password (or update email/password)
await auth.updateUser(OPERATOR_UID, { password: TEMP_PASSWORD });
console.log(`Set temporary password on ${OPERATOR_EMAIL}`);

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
console.log('Password: (the OPERATOR_PASSWORD you provided — rotate it after first login)');
console.log('========================');
console.log('\nNext: go to https://hsc-tracker.pages.dev/sign-in and use the above.');
console.log('The /sign-in page will need an email/password form added (it currently has only Google sign-in).');

process.exit(0);
