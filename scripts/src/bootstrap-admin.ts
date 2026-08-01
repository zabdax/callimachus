import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type BootstrapAdminOptions = { dryRun?: boolean };

/**
 * Pure-ish helper that promotes a Firebase Auth user to admin:
 *  1. Sets custom claim `{ admin: true }` on the Auth user (idempotent).
 *  2. Creates /admins/{uid} Firestore doc (idempotent).
 *
 * Requires the Firebase Admin SDK to be initialized with credentials
 * that allow `auth.updateUser` + `firestore.doc().set()`.
 */
export async function run(uid: string | undefined, opts: BootstrapAdminOptions = {}): Promise<void> {
  if (!uid) throw new Error('uid is required');

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