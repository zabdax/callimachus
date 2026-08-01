import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildSignedUploadSpec,
  generateSignedUploadUrl,
  type R2Signer,
} from '../src/handlers/generateSignedUploadUrl';
import {
  approvePayment,
  type AdminLookup,
  type AuditLog,
} from '../src/handlers/approvePayment';
import { StubFirestore, WorkerError } from '../src/db';

class StubR2 implements R2Signer {
  signed: { path: string; contentType: string; expires: number } | null = null;
  async signPutUrl(path: string, contentType: string, expires: number): Promise<string> {
    this.signed = { path, contentType, expires };
    return `https://signed.example/${path}?exp=${expires}`;
  }
}

class StubAdmins implements AdminLookup {
  adminUids = new Set<string>();
  isAdmin(uid: string): Promise<boolean> {
    return Promise.resolve(this.adminUids.has(uid));
  }
}

class StubAudit implements AuditLog {
  entries: { actor: string; action: string; target: string; after: Record<string, unknown> }[] = [];
  log(entry: { actor: string; action: string; target: string; after: Record<string, unknown> }): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }
}

describe('buildSignedUploadSpec', () => {
  it('rejects non-image content types', () => {
    expect(() => buildSignedUploadSpec('u1', { contentType: 'application/pdf' })).toThrow(WorkerError);
  });

  it('returns a path under paymentRequests/{uid}/{uuid}.{ext}', () => {
    const spec = buildSignedUploadSpec('u1', { contentType: 'image/png' }, () => 1000);
    expect(spec.path).toMatch(/^paymentRequests\/u1\/.+\.png$/);
    expect(spec.expires).toBe(1000 + 5 * 60_000);
  });

  it('honors explicit fileExt', () => {
    const spec = buildSignedUploadSpec('u1', { contentType: 'image/jpeg', fileExt: '.jpg' }, () => 0);
    expect(spec.path).toMatch(/\.jpg$/);
  });
});

describe('generateSignedUploadUrl', () => {
  it('combines spec with the R2 signer', async () => {
    const r2 = new StubR2();
    const out = await generateSignedUploadUrl(
      'u1',
      { contentType: 'image/png' },
      r2,
      () => 1_000_000,
    );
    expect(r2.signed?.path).toBe(out.path);
    expect(out.url).toMatch(/^https:\/\/signed\.example\//);
    expect(out.expires).toBe(1_000_000 + 5 * 60_000);
  });
});

describe('approvePayment', () => {
  let db: StubFirestore & { pr?: { uid: string; planId: string } | null; subWrites: unknown[]; approvals: unknown[] };
  let admins: StubAdmins;
  let audit: StubAudit;

  beforeEach(() => {
    db = Object.assign(new StubFirestore(), { pr: null, subWrites: [], approvals: [] });
    db.getPaymentRequest = async () => db.pr ?? null;
    db.setUserSubscription = async (_uid, sub) => {
      db.subWrites.push(sub);
    };
    db.markPaymentRequestApproved = async (_id, by, at) => {
      db.approvals.push({ by, at });
    };
    admins = new StubAdmins();
    audit = new StubAudit();
  });

  it('rejects when caller is not admin', async () => {
    await expect(
      approvePayment('u1', { paymentRequestId: 'pr1' }, db, admins, audit),
    ).rejects.toThrow(/admin/i);
  });

  it('rejects when paymentRequest does not exist', async () => {
    admins.adminUids.add('admin-uid');
    db.pr = null;
    await expect(
      approvePayment('admin-uid', { paymentRequestId: 'pr1' }, db, admins, audit),
    ).rejects.toThrow(/not.found/i);
  });

  it('approves: writes subscription, marks pr, writes audit', async () => {
    admins.adminUids.add('admin-uid');
    db.pr = { uid: 'u9', planId: '3m' };
    const out = await approvePayment(
      'admin-uid',
      { paymentRequestId: 'pr1' },
      db,
      admins,
      audit,
      () => 1000,
    );
    expect(out.ok).toBe(true);
    // 3m → 3 * 30 days
    const expected = 1000 + 3 * 30 * 86_400_000;
    expect(db.subWrites[0]).toMatchObject({
      status: 'active',
      plan: '3m',
      expiresAt: expected,
    });
    expect(db.approvals[0]).toEqual({ by: 'admin-uid', at: 1000 });
    expect(audit.entries[0]).toMatchObject({
      actor: 'admin-uid',
      action: 'approve_payment',
      target: 'pr1',
    });
  });
});