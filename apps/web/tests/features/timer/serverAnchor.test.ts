import { describe, it, expect, vi } from 'vitest';
import { callSessionStart } from '@/features/timer/serverAnchor';

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async (data: { clientStartTs: number }) => ({ data: { serverStartTs: data.clientStartTs + 1 } }),
}));

describe('serverAnchor', () => {
  it('returns serverStartTs', async () => {
    const r = await callSessionStart(1000);
    expect(r.serverStartTs).toBe(1001);
  });
});
