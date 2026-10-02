import { describe, it, expect, beforeEach } from 'vitest';
import { approvePayment } from '../src/handlers/approvePayment';
import { StubDb, WorkerError, type PaymentRequest, type SubscriptionDoc } from '../src/db';

class PaymentDb extends StubDb {
  request: PaymentRequest | null = { uid: 'u1', planId: '3m', status: 'pending', updateTime: 'ut-1' };
  subscription: SubscriptionDoc | null = null;
  events: string[] = [];
  approvedWith: Array<string | undefined> = [];

  override getPaymentRequest(): Promise<PaymentRequest | null> {
    return Promise.resolve(this.request);
  }
  override getUserSubscription(): Promise<SubscriptionDoc | null> {
    return Promise.resolve(this.subscription);
  }
  override markPaymentRequestApproved(_id: string, _by: string, _at: number, updateTime?: string): Promise<void> {
    // Mimic the compare-and-set updateTime precondition.
    const current = this.request;
    if (!current || current.updateTime !== updateTime) return Promise.reject(new Error('supabase PATCH 409'));
    this.request = { ...current, status: 'approved' };
    this.approvedWith.push(updateTime);
    this.events.push('flip');
    return Promise.resolve();
  }
  override setUserSubscription(_uid: string, sub: SubscriptionDoc): Promise<void> {
    this.subscription = sub;
    this.events.push('subscribe');
    return Promise.resolve();
  }
}

class ConflictingDb extends PaymentDb {
  override markPaymentRequestApproved(): Promise<void> {
    return Promise.reject(new Error('supabase PATCH 409'));
  }
}

const admins = { isAdmin: async () => true };
const noAudit = { log: async () => undefined };

describe('approvePayment', () => {
  let db: PaymentDb;
  beforeEach(() => { db = new PaymentDb(); });

  it('flips status before writing the subscription', async () => {
    await approvePayment('admin', { paymentRequestId: 'pr1' }, db, admins, noAudit, () => 1_700_000_000_000);
    expect(db.events).toEqual(['flip', 'subscribe']);
    expect(db.approvedWith[0]).toBe('ut-1');
  });

  it('stacks a renewal on top of an unexpired subscription', async () => {
    const now = 1_700_000_000_000;
    db.subscription = { status: 'active', plan: '1m', expiresAt: now + 10 * 86_400_000, paymentRequestId: 'old-pr' };
    await approvePayment('admin', { paymentRequestId: 'pr1' }, db, admins, noAudit, () => now);
    expect(db.subscription?.expiresAt).toBe(now + 10 * 86_400_000 + 3 * 30 * 86_400_000);
  });

  it('starts a fresh subscription from now when none is active', async () => {
    const now = 1_700_000_000_000;
    await approvePayment('admin', { paymentRequestId: 'pr1' }, db, admins, noAudit, () => now);
    expect(db.subscription?.expiresAt).toBe(now + 3 * 30 * 86_400_000);
  });

  it('maps a lost approval race to failed-precondition', async () => {
    await expect(approvePayment('admin', { paymentRequestId: 'pr1' }, new ConflictingDb(), admins, noAudit)).rejects.toThrow(WorkerError);
  });

  it('is idempotent when retried after a partial failure (status flipped, subscription missing)', async () => {
    const now = 1_700_000_000_000;
    await approvePayment('admin', { paymentRequestId: 'pr1' }, db, admins, noAudit, () => now);
    db.subscription = null; // simulate crash between flip and subscription write
    await expect(approvePayment('admin', { paymentRequestId: 'pr1' }, db, admins, noAudit, () => now)).resolves.toEqual({ ok: true });
    const sub = db.subscription as SubscriptionDoc | null;
    expect(sub?.status).toBe('active');
    expect(sub?.paymentRequestId).toBe('pr1');
  });

  it('rejects non-admins', async () => {
    await expect(approvePayment('random', { paymentRequestId: 'pr1' }, db, { isAdmin: async () => false }, noAudit)).rejects.toThrow(WorkerError);
  });
});
