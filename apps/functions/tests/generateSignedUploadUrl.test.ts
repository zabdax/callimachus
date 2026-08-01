import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSignedUrl = vi.fn().mockResolvedValue('https://storage.googleapis.com/test');
const file = vi.fn(() => ({ getSignedUrl }));
const bucket = vi.fn(() => ({ file }));
const storage = vi.fn(() => ({ bucket }));
const firestoreDoc = vi.fn(() => ({ set: vi.fn().mockResolvedValue(undefined) }));
const firestore = vi.fn(() => ({ doc: firestoreDoc }));

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  storage: (...args: unknown[]) => storage(...args),
  firestore: (...args: unknown[]) => firestore(...args),
}));

import { generateSignedUploadUrl } from '../src/generateSignedUploadUrl';

describe('generateSignedUploadUrl', () => {
  beforeEach(() => {
    getSignedUrl.mockClear();
    file.mockClear();
    bucket.mockClear();
  });
  it('rejects unauthenticated requests', async () => {
    await expect(
      generateSignedUploadUrl.run(
        { data: { contentType: 'image/png' } },
        { auth: undefined } as never,
      ),
    ).rejects.toThrow(/sign in/i);
  });

  it('rejects non-image content types', async () => {
    await expect(
      generateSignedUploadUrl.run(
        { data: { contentType: 'application/pdf' } },
        { auth: { uid: 'u1' } } as never,
      ),
    ).rejects.toThrow(/image/i);
  });

  it('returns a path under paymentRequests/{uid}/* and a signed url', async () => {
    const out = await generateSignedUploadUrl.run(
      { data: { contentType: 'image/png' } },
      { auth: { uid: 'u1' } } as never,
    );
    expect(out.path).toMatch(/^paymentRequests\/u1\//);
    expect(out.url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
  });

  it('sets the signed url expiry to ~5 minutes from now', async () => {
    await generateSignedUploadUrl.run(
      { data: { contentType: 'image/png' } },
      { auth: { uid: 'u1' } } as never,
    );
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const opts = (getSignedUrl.mock.calls[0] as unknown as [{ expires: number }])[0];
    const ttlMs = opts.expires - Date.now();
    expect(ttlMs).toBeGreaterThan(4 * 60 * 1000);
    expect(ttlMs).toBeLessThan(6 * 60 * 1000);
  });
});