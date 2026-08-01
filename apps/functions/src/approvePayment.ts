import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

const PLAN_MONTHS: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '12m': 12,
};

async function innerHandler(
  request: CallableRequest<{ paymentRequestId: string }>,
) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { uid } = request.auth;

  // Admin gate. Server-side check mirrors the Firestore rules `isAdmin()`.
  const adminSnap = await admin
    .firestore()
    .doc(`admins/${uid}`)
    .get();
  if (!adminSnap.exists) {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }

  const { paymentRequestId } = request.data;
  if (!paymentRequestId) {
    throw new HttpsError('invalid-argument', 'paymentRequestId required.');
  }

  const prRef = admin.firestore().doc(`paymentRequests/${paymentRequestId}`);
  const prSnap = await prRef.get();
  if (!prSnap.exists) {
    throw new HttpsError('not-found', 'paymentRequest not found.');
  }
  const pr = prSnap.data() as { uid: string; planId: string };

  const months = PLAN_MONTHS[pr.planId] ?? 1;
  const expiresAt = Date.now() + months * 30 * 86_400_000;

  // Update user subscription
  await admin
    .firestore()
    .doc(`users/${pr.uid}`)
    .set(
      {
        subscription: {
          status: 'active',
          plan: pr.planId,
          expiresAt,
          paymentRequestId,
        },
        updatedAt: Date.now(),
      },
      { merge: true },
    );

  // Mark paymentRequest approved
  await prRef.update({
    status: 'approved',
    approvedAt: Date.now(),
    approvedBy: uid,
  });

  // Audit log
  await admin.firestore().collection('audit').add({
    actor: uid,
    action: 'approve_payment',
    target: paymentRequestId,
    before: null,
    after: { uid: pr.uid, plan: pr.planId, expiresAt },
    at: Date.now(),
  });

  return { ok: true };
}

export const approvePayment = onCall<{ paymentRequestId: string }>(innerHandler);

(approvePayment as any).run = (
  raw: unknown,
  ctx: { auth?: { uid: string; token?: Record<string, unknown> } },
) => {
  const wrapped = raw as { data?: { paymentRequestId: string } };
  const data = wrapped?.data ?? (raw as { paymentRequestId: string });
  return innerHandler({ data, auth: ctx.auth } as CallableRequest<{ paymentRequestId: string }>);
};