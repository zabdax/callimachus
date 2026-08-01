import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type PendingRequest = {
  id: string;
  uid: string;
  planId: string;
  status: string;
  trxId: string;
  storagePath?: string;
  createdAt?: number;
};

/**
 * Reads `paymentRequests` where status == 'pending', ordered by createdAt desc,
 * limit 50. Returns plain objects.
 */
export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  const db = getFirestore(app);
  const q = query(
    collection(db, 'paymentRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const out: PendingRequest = {
      id: d.id,
      uid: (data as { uid?: string }).uid ?? '',
      planId: (data as { planId?: string }).planId ?? '',
      status: (data as { status?: string }).status ?? 'pending',
      trxId: (data as { trxId?: string }).trxId ?? '',
    };
    const sp = (data as { storagePath?: string }).storagePath;
    if (sp) out.storagePath = sp;
    const created = (data as { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.();
    if (typeof created === 'number') out.createdAt = created;
    return out;
  });
}