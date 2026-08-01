import { describe, it, expect, vi, beforeEach } from 'vitest';

const setCustomUserClaimsMock = vi.fn();
const getUserMock = vi.fn();
const docGetMock = vi.fn();
const docSetMock = vi.fn();
const docRefMock = vi.fn(() => ({ get: docGetMock, set: docSetMock }));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: (...args: unknown[]) => getUserMock(...args),
    setCustomUserClaims: (...args: unknown[]) => setCustomUserClaimsMock(...args),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: (...args: unknown[]) => docRefMock(...args) }),
  FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
}));

const spawnSync = vi.fn();
vi.mock('node:child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSync(...args),
}));

import { run } from '../src/bootstrap-admin';

describe('bootstrap-admin (pure)', () => {
  beforeEach(() => {
    setCustomUserClaimsMock.mockReset();
    getUserMock.mockReset();
    docGetMock.mockReset();
    docSetMock.mockReset();
  });

  it('throws when uid is missing', async () => {
    await expect(run(undefined)).rejects.toThrow(/uid/i);
  });

  it('skips claim write when admin claim already set', async () => {
    getUserMock.mockResolvedValue({ uid: 'u1', email: 'a@b.c', customClaims: { admin: true } });
    docGetMock.mockResolvedValue({ exists: true });
    await run('u1');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(docSetMock).not.toHaveBeenCalled();
  });

  it('writes claim + /admins/{uid} doc for a non-admin user', async () => {
    getUserMock.mockResolvedValue({ uid: 'u2', email: 'x@y.z', customClaims: {} });
    docGetMock.mockResolvedValue({ exists: false });
    await run('u2');
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith('u2', { admin: true });
    expect(docSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u2', email: 'x@y.z', role: 'admin' }),
    );
  });

  it('dry-run skips both writes', async () => {
    getUserMock.mockResolvedValue({ uid: 'u3', email: 'm@n.o', customClaims: {} });
    docGetMock.mockResolvedValue({ exists: false });
    await run('u3', { dryRun: true });
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(docSetMock).not.toHaveBeenCalled();
  });
});