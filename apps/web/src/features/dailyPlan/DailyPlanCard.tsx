import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { PageLoading, PageMessage } from '@/components/ui/PageState';
type Plan = { date: string; tasks: { id: string; type: string; minutes: number; scheduledFor: Date }[] };
export function DailyPlanCard({ uid, date }: { uid: string; date: string }) {
  const q = useQuery({ queryKey: ['dailyPlan', uid, date], queryFn: async () => { const snap = await getDoc(doc(getFirestore(app), `users/${uid}/meta/dailyPlan/${date}`)); if (!snap.exists()) return null; const value = snap.data() as { date: string; tasks?: { id: string; type: string; minutes: number; scheduledFor: { toDate: () => Date } }[] }; return { date: value.date, tasks: (value.tasks ?? []).map((task) => ({ ...task, scheduledFor: task.scheduledFor.toDate() })) } satisfies Plan; } });
  if (q.isLoading) return <PageLoading label="Loading today’s plan…" />;
  if (q.isError) return <PageMessage title="Today’s plan is unavailable" retry={() => void q.refetch()} />;
  if (!q.data || q.data.tasks.length === 0) return <section className="rounded-xl border border-surface-2 bg-surface p-4 text-text"><h3 className="font-display text-lg">Today’s plan</h3><p className="mt-1 text-sm text-text-dim">No tasks are planned yet. Add a task or check back later.</p></section>;
  return <section className="rounded-xl border border-surface-2 bg-surface p-4 text-text"><h3 className="font-display text-lg">Today’s plan</h3><ol className="mt-2 list-decimal space-y-1 pl-5">{q.data.tasks.map((task) => <li key={task.id}>{task.type} · {task.minutes}m</li>)}</ol></section>;
}
