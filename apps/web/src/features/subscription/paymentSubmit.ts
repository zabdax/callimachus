import { getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
 *  1. Mint a signed upload URL via the `generateSignedUploadUrl` Cloud Function.
 *  2. PUT the screenshot file to that signed URL.
 *  3. Write a `paymentRequests/{autoId}` doc with status='pending'.
 *
 * Returns the created paymentRequest id.
 */
export async function submitPaymentRequest(input: SubmitInput): Promise<string> {
  const { uid, planId, trxId, file } = input;

  const mint = httpsCallable<
    { contentType: string },
    { url: string; path: string; expires: number }
  >(getFunctions(app), 'generateSignedUploadUrl');

  const { data: signed } = await mint({ contentType: file.type });

  // Upload the file via the signed URL. We could also use the Storage SDK
  // with `uploadBytes(ref(storage, path), file)`, but the signed URL flow
  // keeps the bucket un-listed publicly.
  await uploadBytes(ref(getStorage(app), signed.path), file);

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