// The server-side `scheduledRevisions` write-trigger creates auto-SR tasks
// when a chapter's `firstStudy` flag flips true. This hook is a thin client
// facade for invalidation: callers invalidate ['tasks', uid] after toggling
// a chapter, and the auto-scheduled tasks appear in the next list query.
import { useQueryClient } from '@tanstack/react-query';

export function useSpacedRepetition(uid: string) {
  const qc = useQueryClient();
  return {
    refresh: () => qc.invalidateQueries({ queryKey: ['tasks', uid] }),
  };
}