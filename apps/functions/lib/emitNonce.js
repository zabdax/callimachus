import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { newNonce } from './presenceNonce.js';
admin.initializeApp();
export const emitNonce = onSchedule({ schedule: '*/5 * * * *', timeZone: 'Asia/Dhaka' }, async () => {
    const db = admin.firestore();
    const active = await db.collectionGroup('activeSession').where('serverStartTs', '>', 0).get();
    if (active.empty)
        return;
    const pick = active.docs[Math.floor(Math.random() * active.docs.length)];
    const id = newNonce();
    const issuedAt = Date.now();
    const uid = pick.ref.parent.parent?.id;
    if (!uid)
        return;
    await db.doc(`users/${uid}/activeSession/current/pendingNonces/${id}`).set({
        issuedAt, echoed: false, expiresAt: issuedAt + 60_000,
    });
});
