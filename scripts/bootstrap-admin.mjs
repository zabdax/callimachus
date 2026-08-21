#!/usr/bin/env node
// Promote a Firebase Auth user to admin.
//
// What it does:
//   1. Sets a custom claim { admin: true } on the Firebase Auth user
//      (Firestore rules' isAdmin() reads /admins/{uid}; we mirror that
//      by ALSO writing a doc to /admins/{uid}. This is the documented
//      "admin" signal the rules trust.)
//   2. Creates the /admins/{uid} Firestore document with a timestamp.
//
// Usage:
//   node scripts/bootstrap-admin.mjs <uid> [--dry-run]
//
// Requires GOOGLE_APPLICATION_CREDENTIALS (service-account JSON) to be
// set in the environment, or `firebase login` + `firebase use <project>`.
//
// Run AFTER the user has signed in to the production app at least once
// (otherwise the auth user does not yet exist).
//
// The logic below mirrors scripts/src/bootstrap-admin.ts (the unit-tested
// module). It is inlined because stock Node 20 cannot strip types from a
// sibling .ts import at runtime — same reason as deploy.mjs.

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function run(uid, opts = {}) {
  if (!uid) throw new Error('uid is required (pass the Firebase Auth UID as argv[2])');

  const auth = getAuth();
  const db = getFirestore();

  const userRecord = await auth.getUser(uid);
  const claims = userRecord.customClaims ?? {};

  if (!claims.admin && !opts.dryRun) {
    await auth.setCustomUserClaims(uid, { admin: true, ...claims });
  }

  const adminRef = db.doc(`admins/${uid}`);
  const existing = await adminRef.get();
  if (!existing.exists && !opts.dryRun) {
    await adminRef.set({
      uid,
      email: userRecord.email ?? null,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

initializeApp();

const uid = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

run(uid, { dryRun }).then(() => {
  console.log(dryRun ? `dry-run complete for ${uid}` : `promoted ${uid} to admin`);
}).catch((e) => {
  console.error('bootstrap-admin failed:', e);
  process.exit(1);
});
