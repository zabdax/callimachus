import type { FirestoreAdapter } from '../db';
import { WorkerError } from '../db';

const PLAN_MONTHS: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '12m': 12,
};

export interface AuditLog {
  log(opts: { actor: string; action: string; target: string; after: Record<string, unknown>; at?: number }): Promise<void>;
}

export interface AdminLookup {
  isAdmin(uid: string): Promise<boolean>;
}

/**
 * Pure handler: admin approves a paymentRequest, setting the user's
 * subscription + marking the request approved + writing an audit log.
 *
 * In production, AdminLookup.isAdmin reads /admins/{uid}; in tests it's
 * injected.
 */
export async function approvePayment(
  adminUid: string,
  input: { paymentRequestId: string },
  db: FirestoreAdapter,
  admins: AdminLookup,
  audit: AuditLog,
  now: () => number = () => Date.now(),
): Promise<{ ok: true }> {
  if (!input.paymentRequestId) {
    throw new WorkerError('invalid-argument', 'paymentRequestId required.');
  }

  const isAdmin = await admins.isAdmin(adminUid);
  if (!isAdmin) {
    throw new WorkerError('permission-denied', 'Admin role required.');
  }

  const pr = await db.getPaymentRequest(input.paymentRequestId);
  if (!pr) {
    throw new WorkerError('not-found', 'paymentRequest not found.');
  }
  const { uid, planId } = pr;

  const months = PLAN_MONTHS[planId] ?? 1;
  const expiresAt = now() + months * 30 * 86_400_000;

  await db.setUserSubscription(uid, {
    status: 'active',
    plan: planId,
    expiresAt,
    paymentRequestId: input.paymentRequestId,
  });

  await db.markPaymentRequestApproved(input.paymentRequestId, adminUid, now());

  await audit.log({
    actor: adminUid,
    action: 'approve_payment',
    target: input.paymentRequestId,
    after: { uid, plan: planId, expiresAt },
    at: now(),
  });

  return { ok: true };
}