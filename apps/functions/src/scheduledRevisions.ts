import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const day = 86400_000;
const TYPES = ['firstRevision', 'secondRevision', 'thirdRevision'] as const;
type RevType = (typeof TYPES)[number];
const OFFSETS: Record<RevType, number> = {
  firstRevision: 7,
  secondRevision: 14,
  thirdRevision: 30,
};

export const scheduledRevisions = onDocumentWritten(
  'users/{uid}/syllabus/{subjectId}',
  async (event) => {
    const before = (event.data?.before.data()?.chapters ?? {}) as Record<
      string,
      { firstStudy?: boolean; firstStudyDate?: { toDate: () => Date } | null }
    >;
    const after = (event.data?.after.data()?.chapters ?? {}) as Record<
      string,
      { firstStudy?: boolean; firstStudyDate?: { toDate: () => Date } | null }
    >;
    const db = getFirestore();
    const writes: Promise<unknown>[] = [];

    for (const [chapterId, afterCh] of Object.entries(after)) {
      const prev = before[chapterId] ?? {};
      const justFirstStudy =
        !prev.firstStudy && !!afterCh.firstStudy && !!afterCh.firstStudyDate;
      if (!justFirstStudy) continue;

      const firstDate = (afterCh.firstStudyDate as { toDate: () => Date }).toDate();
      for (const t of TYPES) {
        const taskId = `sr-${chapterId}-${t}`;
        const ref = db.doc(`users/${event.params.uid}/upcomingTasks/${taskId}`);
        writes.push(
          ref.set(
            {
              subjectId: event.params.subjectId,
              chapterId,
              type: t,
              source: 'auto-sr',
              scheduledFor: Timestamp.fromMillis(firstDate.getTime() + OFFSETS[t] * day),
              status: 'pending',
              createdAt: Timestamp.now(),
            },
            { merge: true },
          ),
        );
      }
    }
    await Promise.all(writes);
  },
);
