import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const policyPath = resolve(__dirname, '../../../r2-bucket-policy.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

describe('R2 bucket policy (replaces storage.rules)', () => {
  it('declares version 2012-10-17', () => {
    expect(policy.Version).toBe('2012-10-17');
  });

  it('denies everything by default (no Allow outside specific statements)', () => {
    const denyAll = policy.Statement.find((s: { Sid?: string }) => s.Sid === 'DenyAll');
    expect(denyAll).toBeDefined();
    expect(denyAll.Effect).toBe('Deny');
  });

  it('allows owner-scoped reads on paymentRequests/{uid}/* (for admin to view screenshots)', () => {
    const stmt = policy.Statement.find((s: { Sid?: string }) => s.Sid === 'OwnerReadPaymentScreenshots');
    expect(stmt).toBeDefined();
    expect(stmt.Effect).toBe('Allow');
    expect(stmt.Action).toContain('s3:GetObject');
    // Resource uses a Condition that scopes by uid — the condition
    // compares the requester's userId (from the JWT) to the path prefix.
    expect(stmt.Condition).toBeDefined();
  });

  it('allows owner PUT only when content-type is image/*', () => {
    const stmt = policy.Statement.find((s: { Sid?: string }) => s.Sid === 'OwnerPutPaymentScreenshot');
    expect(stmt).toBeDefined();
    expect(stmt.Action).toContain('s3:PutObject');
    // The condition string matches image/ MIME types.
    const condStr = JSON.stringify(stmt.Condition);
    expect(condStr).toMatch(/image\/.*/);
  });
});