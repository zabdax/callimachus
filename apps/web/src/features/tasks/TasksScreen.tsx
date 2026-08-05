import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';
import { useUpcomingTasks } from './useUpcomingTasks';
import { PageLoading, PageMessage } from '@/components/ui/PageState';
export function TasksScreen() {
  const { t } = useTranslation(); const { user } = useAuth(); const uid = user?.uid ?? '';
  const { data = [], isLoading, isError, refetch, complete, skip } = useUpcomingTasks(uid);
  if (!uid) return null;
  if (isLoading) return <PageLoading label="Loading your revision tasks…" />;
  if (isError) return <PageMessage title="Tasks couldn’t load" detail="Check your connection and try again." retry={() => void refetch()} />;
  if (data.length === 0) return <p className="p-4 text-text-dim">{t('tasks.empty')}</p>;
  return <section className="p-4"><h1 className="mb-4 font-display text-2xl">Upcoming tasks</h1><ul className="divide-y divide-surface-2 rounded-xl border border-surface-2 bg-surface">{data.map((task) => <li key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-text">{task.subjectId} · <em>{task.type}</em> · {task.scheduledFor.toDateString()}</span><div className="flex gap-3"><button type="button" onClick={() => complete.mutate(task.id)} className="font-medium text-success">{t('tasks.markDone')}</button><button type="button" onClick={() => skip.mutate(task.id)} className="text-text-dim">Skip</button></div></li>)}</ul></section>;
}
