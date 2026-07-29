import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthContext';
import { useUpcomingTasks } from './useUpcomingTasks';

export function TasksScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data = [], complete, skip } = useUpcomingTasks(uid);
  if (!uid) return null;

  if (data.length === 0)
    return <p className="p-4 text-text-dim">{t('tasks.empty')}</p>;

  return (
    <ul className="divide-y divide-surface-2 p-4">
      {data.map((task) => (
        <li key={task.id} className="flex items-center justify-between py-2">
          <span className="text-text">
            {task.subjectId} · <em>{task.type}</em> · {task.scheduledFor.toDateString()}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => complete.mutate(task.id)}
              className="text-success"
            >
              {t('tasks.markDone')}
            </button>
            <button
              type="button"
              onClick={() => skip.mutate(task.id)}
              className="text-text-dim"
            >
              Skip
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}