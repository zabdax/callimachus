import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addBlock, completeBlock, listTimeBlocks, type TimeBlock } from './blocks';

export function useTimeBlocks(uid: string, date: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['timeBlocks', uid, date], queryFn: () => listTimeBlocks(uid, date), enabled: !!uid });
  const add = useMutation({
    mutationFn: (b: Parameters<typeof addBlock>[1]) => addBlock(uid, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeBlocks', uid, date] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => completeBlock(uid, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeBlocks', uid, date] }),
  });
  return { ...q, add, complete };
}
export type { TimeBlock };
