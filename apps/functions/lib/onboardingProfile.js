import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
initializeApp();
const TRIAL_DAYS = 7;
/**
 * Pure handler — exported separately so tests can call it directly without
 * pulling in the Firebase onCall wrapper. The same function is mounted as
 * a Cloud Function below.
 */
export async function onboardingProfileHandler(request) {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in first');
    const { uid } = request.auth;
    const db = getFirestore();
    const data = request.data;
    if (!data.batchId || !data.medium) {
        throw new HttpsError('invalid-argument', 'batchId and medium are required');
    }
    await db.doc(`users/${uid}`).set({
        uid,
        displayName: data.displayName ?? request.auth.token.name ?? '',
        email: request.auth.token.email ?? '',
        photoURL: request.auth.token.picture ?? null,
        college: data.college ?? '',
        batchId: data.batchId,
        medium: data.medium,
        timezone: 'Asia/Dhaka',
        trialEnd: Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 86400_000),
        subscription: { status: 'trial', plan: null, expiresAt: null, paymentRequestId: null },
        batchHistory: [data.batchId],
        fcmTokens: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    }, { merge: true });
    return { ok: true };
}
export const onboardingProfile = onCall(onboardingProfileHandler);
