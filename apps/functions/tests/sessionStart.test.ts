import { describe, it, expect, vi } from 'vitest';

const set = vi.fn().mockResolvedValue(undefined);
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  firestore: () => ({ doc: () => ({ set }) }),
}));

import { sessionStart } from '../src/sessionStart';

describe('sessionStart', () => {
  it('writes { serverStartTs, clientStartTs } and returns serverStartTs', async () => {
    const before = Date.now();
    const out = await sessionStart.run(
      { data: { clientStartTs: 123 } },
      { auth: { uid: 'u1' } } as never,
    );
    expect(out.serverStartTs).toBeGreaterThanOrEqual(before);
    expect(set).toHaveBeenCalled();
  });
});
