import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type BootstrapAdminOptions = { dryRun?: boolean };

/**
 * TEMPLATE helper for promoting a Firebase Auth user to admin.
 *
 * What it does:
 *  1. Sets custom claim `{ admin: true }` on the Auth user (idempotent).
 *  2. Writes /admins/{uid} Firestore doc with a timestamp (idempotent).
 *
 * Reads credentials from the environment (GOOGLE_APPLICATION_CREDENTIALS
 * pointing at a service-account JSON outside this repo, or `firebase
 * login`). This script never embeds credentials.
 *
 * Before running this against your own Firebase project, please read
 * docs/admin-bootstrap.md (the steps there are for the maintainers'
 * production project; clone them for your own project).
 */
export async function run(uid: string | undefined, opts: BootstrapAdminOptions = {}): Promise<void> {
  if (!uid) throw new Error('uid is required (pass the Firebase Auth UID as argv[2])');

  const auth = getAuth();
  const db = getFirestore();

  const userRecord = await auth.getUser(uid);
  const claims = userRecord.customClaims ?? {};

  if (!claims.admin) {
    if (!opts.dryRun) {
      await auth.setCustomUserClaims(uid, { admin: true, ...claims });
    }
  }

  const adminRef = db.doc(`admins/${uid}`);
  const existing = await adminRef.get();
  if (!existing.exists) {
    if (!opts.dryRun) {
      await adminRef.set({
        uid,
        email: userRecord.email ?? null,
        role: 'admin',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
}
