import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

admin.initializeApp();

export type RevisionReminderInput = {
  subjectId: string;
  chapterName: string;
};

/**
 * Pure builder for revision-reminder push notifications. Exported so unit
 * tests can validate the shape without spinning up the Functions emulator.
 */
export function buildRevisionReminder(input: RevisionReminderInput) {
  const safeName =
    input.chapterName.length > 60
      ? input.chapterName.slice(0, 57) + '…'
      : input.chapterName;
  return {
    topic: 'revisions',
    notification: {
      title: 'Revision due today',
      body: `Time to revise: ${safeName}`,
    },
    data: { subjectId: input.subjectId, chapterName: input.chapterName },
  };
}

/**
 * Scheduled function: every hour, reads pending upcomingTasks whose
 * `scheduledFor` is within the next hour, and sends a revision reminder.
 */
export const sendRevisionReminder = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'Asia/Dhaka' },
  async () => {
    const now = Date.now();
    const oneHourLater = now + 60 * 60 * 1000;
    const snap = await admin
      .firestore()
      .collection('upcomingTasks')
      .where('status', '==', 'pending')
      .where('scheduledFor', '>=', now)
      .where('scheduledFor', '<=', oneHourLater)
      .get();

    const sends = snap.docs.map((d) => {
      const data = d.data() as { subjectId: string; chapterName: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return admin.messaging().send(buildRevisionReminder(data) as any);
    });
    await Promise.all(sends);
  },
);