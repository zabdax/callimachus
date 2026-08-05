import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';

const PLAN_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };

export interface AuditLog {
  log(opts: { actor: string; action: string; target: string; after: Record<string, unknown>; at?: number }): Promise<void>;
}
export interface AdminLookup { isAdmin(uid: string): Promise<boolean>; }

export async function approvePayment(
  adminUid: string,
  input: { paymentRequestId: string },
  db: FirestoreAdapter,
  admins: AdminLookup,
  audit: AuditLog,
  now: () => number = () => Date.now(),
): Promise<{ ok: true }> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.paymentRequestId)) {
    throw new WorkerError('invalid-argument', 'paymentRequestId required.');
  }
  if (!(await admins.isAdmin(adminUid))) throw new WorkerError('permission-denied', 'Admin role required.');
  const pr = await db.getPaymentRequest(input.paymentRequestId);
  if (!pr) throw new WorkerError('not-found', 'paymentRequest not found.');
  if (pr.status !== 'pending') throw new WorkerError('failed-precondition', 'payment request is no longer pending');
  const months = PLAN_MONTHS[pr.planId];
  if (!months) throw new WorkerError('invalid-argument', 'unsupported subscription plan');
  const approvedAt = now();
  const expiresAt = approvedAt + months * 30 * 86_400_000;
  await db.setUserSubscription(pr.uid, { status: 'active', plan: pr.planId, expiresAt, paymentRequestId: input.paymentRequestId });
  await db.markPaymentRequestApproved(input.paymentRequestId, adminUid, approvedAt, pr.updateTime);
  await audit.log({ actor: adminUid, action: 'approve_payment', target: input.paymentRequestId, after: { uid: pr.uid, plan: pr.planId, expiresAt }, at: approvedAt });
  return { ok: true };
}
