import type { DbAdapter } from '../db';
import { WorkerError } from '../db';

const PLAN_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };

export interface AuditLog {
  log(opts: { actor: string; action: string; target: string; after: Record<string, unknown>; at?: number }): Promise<void>;
}
export interface AdminLookup { isAdmin(uid: string): Promise<boolean>; }

export async function approvePayment(
  adminUid: string,
  input: { paymentRequestId: string },
  db: DbAdapter,
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
  const months = PLAN_MONTHS[pr.planId];
  if (!months) throw new WorkerError('invalid-argument', 'unsupported subscription plan');
  const approvedAt = now();

  if (pr.status === 'pending') {
    // Flip status FIRST, guarded by updateTime (compare-and-set). Two
    // concurrent approvals race here and exactly one wins — writing the
    // subscription first would let both through.
    try {
      await db.markPaymentRequestApproved(input.paymentRequestId, adminUid, approvedAt, pr.updateTime);
    } catch {
      throw new WorkerError('failed-precondition', 'payment request is no longer pending');
    }
  } else if (pr.status === 'approved') {
    // Idempotent retry / recovery path: if a previous approval flipped the
    // status but crashed before writing the subscription, re-apply it.
    const existing = await db.getUserSubscription(pr.uid);
    if (existing?.status === 'active' && existing.paymentRequestId === input.paymentRequestId) {
      return { ok: true };
    }
  } else {
    throw new WorkerError('failed-precondition', 'payment request is no longer pending');
  }

  // Renewals stack on top of an unexpired subscription instead of
  // overwriting it (approving a renewal early would otherwise shrink
  // entitlement).
  const current = await db.getUserSubscription(pr.uid);
  const baseMs = current?.status === 'active' && current.expiresAt > approvedAt ? current.expiresAt : approvedAt;
  const expiresAt = baseMs + months * 30 * 86_400_000;
  await db.setUserSubscription(pr.uid, { status: 'active', plan: pr.planId, expiresAt, paymentRequestId: input.paymentRequestId });
  await audit.log({ actor: adminUid, action: 'approve_payment', target: input.paymentRequestId, after: { uid: pr.uid, plan: pr.planId, expiresAt }, at: approvedAt });
  return { ok: true };
}
