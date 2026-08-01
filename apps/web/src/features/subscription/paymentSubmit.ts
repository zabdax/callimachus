import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { callWorkerUnwrap } from '@/lib/workers/client';
import { app } from '@/lib/firebase/client';
import type { PlanId } from './plans';

type SubmitInput = {
  uid: string;
  planId: PlanId;
  trxId: string;
  file: File;
};

/**
 * End-to-end client flow for submitting a payment request:
 *  1. Mint a signed upload URL via the `generateSignedUploadUrl` Worker
 *     (R2-backed; 5-min expiry, image/* only).
 *  2. PUT the screenshot file to that signed URL.
 *  3. Write a `paymentRequests/{autoId}` doc with status='pending'.
 *
 * Returns the created paymentRequest id.
 */
export async function submitPaymentRequest(input: SubmitInput): Promise<string> {
  const { uid, planId, trxId, file } = input;

  const signed = await callWorkerUnwrap<
    { contentType: string },
    { url: string; path: string; expires: number }
  >('generateSignedUploadUrl', { contentType: file.type });

  // Upload via the signed URL (R2 in production). We deliberately do
  // NOT use `uploadBytes(ref(getStorage(app), signed.path), file)` —
  // we don't want a separate Firebase Storage SDK in the bundle, and
  // the Worker controls the bucket policy entirely.
  const put = await fetch(signed.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`upload failed: ${put.status}`);
  }

  const db = getFirestore(app);
  const docRef = await addDoc(collection(db, 'paymentRequests'), {
    uid,
    planId,
    trxId,
    status: 'pending',
    storagePath: signed.path,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}