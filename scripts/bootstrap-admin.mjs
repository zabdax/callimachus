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

import { initializeApp } from 'firebase-admin/app';
import { run } from './src/bootstrap-admin.ts';

initializeApp();

const uid = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

run(uid, { dryRun }).catch((e) => {
  console.error('bootstrap-admin failed:', e);
  process.exit(1);
});