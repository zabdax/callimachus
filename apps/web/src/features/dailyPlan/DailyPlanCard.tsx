import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

type Plan = { date: string; tasks: { id: string; type: string; minutes: number; scheduledFor: Date }[] };

export function DailyPlanCard({ uid, date }: { uid: string; date: string }) {
  const q = useQuery({
    queryKey: ['dailyPlan', uid, date],
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(app), `users/${uid}/meta/dailyPlan/${date}`));
      if (!snap.exists()) return null;
      const d = snap.data() as Omit<Plan, 'tasks'> & { tasks: { id: string; type: string; minutes: number; scheduledFor: { toDate: () => Date } }[] };
      return { date: d.date, tasks: d.tasks.map((t) => ({ ...t, scheduledFor: t.scheduledFor.toDate() })) } as Plan;
    },
  });
  if (!q.data || q.data.tasks.length === 0) return null;
  return (
    <section className="rounded-lg bg-surface p-4 text-text">
      <h3 className="font-display text-lg">Today’s plan</h3>
      <ol className="mt-2 list-decimal pl-5">
        {q.data.tasks.map((t) => <li key={t.id}>{t.type} · {t.minutes}m</li>)}
      </ol>
    </section>
  );
}
