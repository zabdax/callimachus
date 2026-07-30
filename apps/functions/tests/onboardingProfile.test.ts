import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CallableRequest } from 'firebase-functions/v2/https';

const setMock = vi.fn().mockResolvedValue(undefined);
const docMock = vi.fn(() => ({ set: setMock }));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
  Timestamp: {
    now: () => ({ now: 'server-ts' }),
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
  },
}));
vi.mock('firebase-functions/v2/https', () => ({
  onCall: <T>(_req: unknown, handler: (r: CallableRequest<T>) => Promise<unknown>) => handler,
  HttpsError: class HttpErr extends Error {
    code: string;
    constructor(code: string, msg: string) {
      super(msg);
      this.code = code;
    }
  },
}));

import { onboardingProfileHandler as onboardingProfile } from '../src/onboardingProfile';

// Test fixture helper: build a minimal CallableRequest without going through
// the full Firebase Auth shape (only the fields the handler reads).
function makeReq(payload: unknown, auth: unknown) {
  return { data: payload, auth } as unknown as Parameters<typeof onboardingProfile>[0];
}

describe('onboardingProfile', () => {
  beforeEach(() => {
    setMock.mockClear();
    docMock.mockClear();
  });

  it('creates a user doc with trialEnd = now + 7 days and writes profile fields', async () => {
    const before = Date.now();
    const result = await onboardingProfile(
      makeReq(
        {
          displayName: 'Alice',
          college: 'Dhaka College',
          batchId: 'HSC-2026',
          medium: 'bangla',
        },
        { uid: 'u123', token: { name: 'Alice', email: 'a@b.c', picture: null } },
      ),
    );

    expect(result).toEqual({ ok: true });
    expect(docMock).toHaveBeenCalledWith('users/u123');
    expect(setMock).toHaveBeenCalledTimes(1);

    const payload = setMock.mock.calls[0]?.[0] as {
      uid: string;
      trialEnd: { toMillis: () => number };
      subscription: { status: string };
      batchHistory: string[];
    };
    const opts = setMock.mock.calls[0]?.[1] as { merge: boolean };

    expect(payload.uid).toBe('u123');
    expect(payload.trialEnd.toMillis()).toBeGreaterThanOrEqual(before + 7 * 86400_000 - 5_000);
    expect(payload.subscription.status).toBe('trial');
    expect(payload.batchHistory).toEqual(['HSC-2026']);
    expect(opts).toEqual({ merge: true });
  });

  it('rejects unauthenticated callers', async () => {
    await expect(
      onboardingProfile(
        makeReq({ batchId: 'HSC-2026', medium: 'bangla' }, undefined),
      ),
    ).rejects.toThrow(/Sign in first/);
  });

  it('rejects when batchId or medium is missing', async () => {
    await expect(
      onboardingProfile(
        makeReq({ medium: 'bangla' }, { uid: 'u1', token: {} }),
      ),
    ).rejects.toThrow(/batchId and medium are required/);
  });
});
