import { supabase } from '@/lib/supabase/client';
import type { PlanId } from './plans';

type SubmitInput = {
  uid: string;
  planId: PlanId;
  trxId: string;
};

/**
 * Submit a payment request by inserting a TrxID-bearing row into
 * `payment_requests`. Per Plan 4 §no-screenshot decision (R2 disabled),
 * the screenshot upload step is omitted; admins receive TrxIDs via
 * WhatsApp / email and approve in /admin/approvals manually.
 *
 * Returns the created paymentRequest id.
 */
export async function submitPaymentRequest(input: SubmitInput): Promise<string> {
  const { uid, planId, trxId } = input;
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({ uid, plan_id: planId, trx_id: trxId, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}
