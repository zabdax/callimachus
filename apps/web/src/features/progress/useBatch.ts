import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import type { BatchDates } from '@/features/batches/recomputeBatchStatus';

export type BatchDoc = BatchDates & { label: string; status: 'pre-start'|'in-session'|'exam-window'|'resulted' };

export function useBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['batch', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(app), `batches/${batchId}`));
      if (!snap.exists()) return null;
      const d = snap.data() as { label: string; status: BatchDoc['status']; collegeStart: { toDate: () => Date }; examStart: { toDate: () => Date }; examEnd: { toDate: () => Date } };
      return { label: d.label, status: d.status, collegeStart: d.collegeStart.toDate(), examStart: d.examStart.toDate(), examEnd: d.examEnd.toDate() } as BatchDoc;
    },
  });
}