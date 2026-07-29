import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addManualTask,
  completeUpcomingTask,
  listUpcomingTasks,
  skipUpcomingTask,
} from './upcomingTasks';

export function useUpcomingTasks(uid: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['tasks', uid],
    queryFn: () => listUpcomingTasks(uid),
    enabled: !!uid,
  });
  const add = useMutation({
    mutationFn: (t: Parameters<typeof addManualTask>[1]) => addManualTask(uid, t),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => completeUpcomingTask(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  const skip = useMutation({
    mutationFn: (id: string) => skipUpcomingTask(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  });
  return { ...q, add, complete, skip };
}