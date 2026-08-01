import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
initializeApp();
export function recomputeBatchStatus(b, now) {
    if (now < b.collegeStart)
        return 'pre-start';
    if (now < b.examStart)
        return 'in-session';
    if (now <= b.examEnd)
        return 'exam-window';
    return 'resulted';
}
async function recomputeAllBatches() {
    const db = getFirestore();
    const snap = await db.collection('batches').get();
    const now = new Date();
    const writes = [];
    for (const d of snap.docs) {
        const data = d.data();
        const next = recomputeBatchStatus({
            collegeStart: data.collegeStart.toDate(),
            examStart: data.examStart.toDate(),
            examEnd: data.examEnd.toDate(),
        }, now);
        if (data.status !== next) {
            writes.push(d.ref.update({ status: next, updatedAt: Timestamp.now() }));
        }
    }
    await Promise.all(writes);
    return { updated: writes.length };
}
export const recomputeBatchStatusCron = onSchedule({ schedule: '0 0 * * *', timeZone: 'Asia/Dhaka' }, async () => {
    await recomputeAllBatches();
});
export const recomputeBatchStatusCallable = onCall(async (request) => {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first');
    return recomputeAllBatches();
});
