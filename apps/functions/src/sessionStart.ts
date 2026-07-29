import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();

const FieldValue = (admin as any).firestore?.FieldValue ?? {
  serverTimestamp: () => ({ __serverTimestamp: true }),
};

async function innerHandler(request: CallableRequest<{ clientStartTs: number }>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const { uid } = request.auth;
  const serverStartTs = Date.now();
  await admin.firestore().doc(`users/${uid}/activeSession/current`).set({
    serverStartTs,
    clientStartTs: request.data.clientStartTs,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { serverStartTs };
}

export const sessionStart = onCall<{ clientStartTs: number }>(innerHandler);
// Expose for unit tests: allow tests to call `sessionStart.run(data, ctx)` directly
// without the Functions emulator.
(sessionStart as any).run = (data: { clientStartTs: number }, ctx: { auth: { uid: string } }) =>
  innerHandler({ data, auth: ctx.auth } as CallableRequest<{ clientStartTs: number }>);
