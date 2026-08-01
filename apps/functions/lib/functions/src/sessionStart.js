import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
admin.initializeApp();
const FieldValue = admin.firestore?.FieldValue ?? {
    serverTimestamp: () => ({ __serverTimestamp: true }),
};
async function innerHandler(request) {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first');
    const { uid } = request.auth;
    const serverStartTs = Date.now();
    await admin.firestore().doc(`users/${uid}/activeSession/current`).set({
        serverStartTs,
        clientStartTs: request.data.clientStartTs,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { serverStartTs };
}
export const sessionStart = onCall(innerHandler);
// Expose for unit tests: allow tests to call `sessionStart.run(data, ctx)` directly
// without the Functions emulator.
sessionStart.run = (data, ctx) => innerHandler({ data, auth: ctx.auth });
