import { supabase } from '@/lib/supabase/client';

export type PendingRequest = {
  id: string;
  uid: string;
  planId: string;
  status: string;
  trxId: string;
  createdAt?: number;
};

/**
 * Reads `payment_requests` where status == 'pending', ordered by created_at
 * desc, limit 50. Returns plain objects. RLS restricts this to admins (plus
 * the service-key worker path).
 */
export async function fetchPendingRequests(): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('id,uid,plan_id,status,trx_id,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const created = row.created_at ? new Date(row.created_at as string).getTime() : undefined;
    return {
      id: row.id as string,
      uid: (row.uid as string) ?? '',
      planId: (row.plan_id as string) ?? '',
      status: (row.status as string) ?? 'pending',
      trxId: (row.trx_id as string) ?? '',
      ...(typeof created === 'number' && !Number.isNaN(created) ? { createdAt: created } : {}),
    };
  });
}
