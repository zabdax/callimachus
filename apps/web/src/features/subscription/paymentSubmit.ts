import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { PlanId } from './plans';

type SubmitInput = {
  uid: string;
  planId: PlanId;
  trxId: string;
};

/**
 * Submit a payment request by writing a TrxID-bearing doc to
 * /paymentRequests. Per Plan 4 §no-screenshot decision (R2 disabled),
 * the screenshot upload step is omitted; admins receive TrxIDs via
 * WhatsApp / email and approve in /admin/approvals manually.
 *
 * Returns the created paymentRequest id.
 */
export async function submitPaymentRequest(input: SubmitInput): Promise<string> {
  const { uid, planId, trxId } = input;
  const db = getFirestore(app);
  const docRef = await addDoc(collection(db, 'paymentRequests'), {
    uid,
    planId,
    trxId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}