import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { BatchDates } from '@/features/batches/recomputeBatchStatus';

export type BatchDoc = BatchDates & { label: string; status: 'pre-start'|'in-session'|'exam-window'|'resulted' };

export function useBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['batch', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('label,status,college_start,exam_start,exam_end')
        .eq('id', batchId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const toDate = (v: string | null): Date => new Date((v as string) ?? 0);
      return {
        label: data.label as string,
        status: data.status as BatchDoc['status'],
        collegeStart: toDate(data.college_start as string | null),
        examStart: toDate(data.exam_start as string | null),
        examEnd: toDate(data.exam_end as string | null),
      } as BatchDoc;
    },
  });
}
