import { onCall, HttpsError } from 'firebase-functions/v2/https';
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
];
/**
 * Pure helper: collects the user's data into a JSON-ready object.
 * Used by the `getUserData` callable and by tests.
 */
export async function collectUserExport(uid) {
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const profile = userSnap.exists ? userSnap.data() : null;
    const sessions = await fetchAll(admin.firestore().collection(`users/${uid}/sessions`));
    const tasks = await fetchAll(admin.firestore().collection(`users/${uid}/upcomingTasks`));
    const syllabus = await fetchAll(admin.firestore().collection(`users/${uid}/syllabus`));
    const settings = profile?.settings ?? null;
    return {
        profile,
        syllabus,
        sessions,
        tasks,
        settings,
        exportedAt: Date.now(),
    };
}
async function fetchAll(q) {
    const snap = await q.get();
    return snap.docs.map((d) => d.data());
}
async function deleteSubcollection(uid, name) {
    const ref = admin.firestore().collection(`users/${uid}/${name}`);
    const snap = await ref.get();
    if (snap.empty)
        return;
    const batch = admin.firestore().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
}
async function innerDelete(request) {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first.');
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
export const getUserData = onCall(async (request) => {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first.');
    const uid = request.auth.uid;
    return collectUserExport(uid);
});
export const deleteUserData = onCall(innerDelete);
// Test entry point for unit tests
deleteUserData.run = (raw, ctx) => {
    const wrapped = raw;
    const data = wrapped?.data ?? raw;
    return innerDelete({ data, auth: ctx.auth });
};
