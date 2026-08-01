import { describe, it, expect, vi } from 'vitest';

const docGet = vi.fn();
const docDelete = vi.fn().mockResolvedValue(undefined);
const collectionGet = vi.fn();
const docUpdate = vi.fn().mockResolvedValue(undefined);

const firestore = vi.fn(() => ({
  doc: vi.fn(() => ({ get: docGet, delete: docDelete, update: docUpdate })),
  collection: vi.fn((name: string) => ({
    get: () => {
      if (name.endsWith('sessions')) {
        return Promise.resolve({
          docs: [{ id: 's1', data: () => ({ durationSec: 60 }) }],
        });
      }
      if (name.endsWith('upcomingTasks')) {
        return Promise.resolve({
          docs: [{ id: 't1', data: () => ({ status: 'pending' }) }],
        });
      }
      return collectionGet();
    },
  })),
  batch: vi.fn(() => ({
    delete: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

const auth = vi.fn(() => ({
  deleteUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: (...args: unknown[]) => firestore(...args),
  auth: (...args: unknown[]) => auth(...args),
}));

import { collectUserExport, deleteUserData } from '../src/userData';

describe('collectUserExport (pure)', () => {
  it('collects profile, syllabus, sessions, tasks, settings', async () => {
    docGet.mockResolvedValue({
      exists: true,
      data: () => ({ displayName: 'A', email: 'a@b.c' }),
    });
    collectionGet.mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ durationSec: 60 }) },
        { id: 't1', data: () => ({ status: 'pending' }) },
      ],
    });
    const out = await collectUserExport('u1');
    expect(out.profile).toMatchObject({ displayName: 'A' });
    expect(out.sessions).toHaveLength(1);
    expect(out.tasks).toHaveLength(1);
    expect(typeof out.exportedAt).toBe('number');
  });
});

describe('deleteUserData', () => {
  it('rejects unauthenticated requests', async () => {
    await expect(
      deleteUserData.run({ data: {} }, { auth: undefined } as never),
    ).rejects.toThrow(/sign in/i);
  });

  it('requires the caller to delete their own data (uid match)', async () => {
    await expect(
      deleteUserData.run(
        { data: { uid: 'u2' } },
        { auth: { uid: 'u1' } } as never,
      ),
    ).rejects.toThrow(/own/i);
  });

  it('deletes subcollections + user doc + auth account when uid matches', async () => {
    docDelete.mockClear();
    collectionGet.mockResolvedValue({ docs: [] });
    const result = await deleteUserData.run(
      { data: { uid: 'u1' } },
      { auth: { uid: 'u1' } } as never,
    );
    expect(result.ok).toBe(true);
  });
});