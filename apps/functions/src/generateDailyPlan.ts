import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { pickDailyPlan } from '../../web/src/features/dailyPlan/pickDailyPlan.js';

initializeApp();
const TZ = 'Asia/Dhaka';

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export const generateDailyPlan = onSchedule({ schedule: '0 5 * * *', timeZone: TZ }, async () => {
  const db = getFirestore();
  const date = todayKey();
  const users = await db.collection('users').get();
  for (const u of users.docs) {
    const tasksSnap = await db.collection(`users/${u.id}/upcomingTasks`)
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', Timestamp.fromDate(new Date(Date.now() + 2 * 86400_000)))
      .get();
    const tasks = tasksSnap.docs.map((d) => {
      const x = d.data() as { id?: string; type: string; minutes?: number; scheduledFor: Timestamp };
      return { id: d.id, type: x.type, minutes: x.minutes ?? 30, scheduledFor: x.scheduledFor.toDate() };
    });
    const picked = pickDailyPlan(tasks, 240);
    await db.doc(`users/${u.id}/meta/dailyPlan/${date}`).set({
      date, generatedAt: Timestamp.now(), tasks: picked,
    }, { merge: true });
  }
});
