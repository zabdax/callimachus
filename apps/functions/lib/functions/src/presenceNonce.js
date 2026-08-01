import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
admin.initializeApp();
export function newNonce() {
    // 12 chars, A-Z + 0-9, ~71 bits of entropy
    const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 12; i++)
        s += a[Math.floor(Math.random() * a.length)];
    return s;
}
async function issue(request) {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first');
    const id = newNonce();
    const issuedAt = Date.now();
    const ref = admin.firestore().doc(`users/${request.auth.uid}/activeSession/current/pendingNonces/${id}`);
    await ref.set({ issuedAt, echoed: false, expiresAt: issuedAt + 60_000 });
    return { id, issuedAt, expiresAt: issuedAt + 60_000 };
}
export const presenceNonce = onCall(issue);
// Test hook: allow unit tests to call `presenceNonce.run(data, ctx)` directly.
presenceNonce.run = (data, ctx) => issue({ data, auth: ctx.auth });
