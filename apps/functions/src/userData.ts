import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

const USER_SUBCOLLECTIONS = [
  'sessions',
  'syllabus',
  'upcomingTasks',
  'meta',
  'activeSession',
  'chapterStats',
  'fcmTokens',
] as const;

export type UserExport = {
  profile: Record<string, unknown> | null;
  syllabus: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
  exportedAt: number;
};

/**
 * Pure helper: collects the user's data into a JSON-ready object.
 * Used by the `getUserData` callable and by tests.
 */
export async function collectUserExport(uid: string): Promise<UserExport> {
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const profile = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : null;

  const sessions = await fetchAll(
    admin.firestore().collection(`users/${uid}/sessions`),
  );
  const tasks = await fetchAll(
    admin.firestore().collection(`users/${uid}/upcomingTasks`),
  );
  const syllabus = await fetchAll(
    admin.firestore().collection(`users/${uid}/syllabus`),
  );

  const settings = (profile?.settings as Record<string, unknown> | undefined) ?? null;

  return {
    profile,
    syllabus,
    sessions,
    tasks,
    settings,
    exportedAt: Date.now(),
  };
}

async function fetchAll(q: FirebaseFirestore.Query): Promise<Record<string, unknown>[]> {
  const snap = await q.get();
  return snap.docs.map((d) => d.data() as Record<string, unknown>);
}

async function deleteSubcollection(uid: string, name: string): Promise<void> {
  const ref = admin.firestore().collection(`users/${uid}/${name}`);
  const snap = await ref.get();
  if (snap.empty) return;
  const batch = admin.firestore().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function innerDelete(
  request: CallableRequest<{ uid: string }>,
): Promise<{ ok: true }> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const targetUid = request.data?.uid;
  if (!targetUid || targetUid !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'You can only delete your own account.');
  }
  const db = admin.firestore();
  for (const sub of USER_SUBCOLLECTIONS) {
    await deleteSubcollection(targetUid, sub);
  }
  await db.doc(`users/${targetUid}`).delete();
  await admin.auth().deleteUser(targetUid);
  return { ok: true };
}

export const getUserData = onCall<{ uid?: string }>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const uid = request.auth.uid;
  return collectUserExport(uid);
});

export const deleteUserData = onCall<{ uid: string }>(innerDelete);

// Test entry point for unit tests
(deleteUserData as any).run = (
  raw: unknown,
  ctx: { auth?: { uid: string } },
) => {
  const wrapped = raw as { data?: { uid: string } };
  const data = wrapped?.data ?? (raw as { uid: string });
  return innerDelete({ data, auth: ctx.auth } as CallableRequest<{ uid: string }>);
};