import { describe, it, expect, vi, beforeEach } from 'vitest';

const getTokenMock = vi.fn();
const onMessageMock = vi.fn(() => () => {});
const requestPermissionMock = vi.fn();

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({ _messaging: true })),
  getToken: (...args: unknown[]) => getTokenMock(...args),
  onMessage: (...args: unknown[]) => onMessageMock(...args),
}));

const docMock = vi.fn();
const setDocMock = vi.fn();
const updateDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ _db: true })),
  doc: vi.fn((...args: unknown[]) => {
    docMock(...args);
    return { _ref: true, path: args.slice(1).join('/') };
  }),
  setDoc: vi.fn((...args: unknown[]) => setDocMock(...args)),
  updateDoc: vi.fn((...args: unknown[]) => updateDocMock(...args)),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

vi.mock('@/lib/firebase/client', () => ({
  app: { _app: true },
}));

import { registerFcmToken, requestNotificationPermission } from '@/features/notifications/fcm';

describe('fcm', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    onMessageMock.mockClear();
    setDocMock.mockReset();
    docMock.mockReset();
  });

  it('requestNotificationPermission returns true when granted', async () => {
    // Mock the Notification global in jsdom
    const original = globalThis.Notification;
    let asked = false;
    globalThis.Notification = {
      requestPermission: vi.fn(async () => {
        asked = true;
        return 'granted' as NotificationPermission;
      }),
      permission: 'default' as NotificationPermission,
    } as unknown as typeof Notification;
    try {
      const out = await requestNotificationPermission();
      expect(asked).toBe(true);
      expect(out).toBe('granted');
    } finally {
      globalThis.Notification = original;
    }
  });

  it('registerFcmToken writes to users/{uid}/fcmTokens/{token}', async () => {
    getTokenMock.mockResolvedValue({ token: 'abc-token' });
    await registerFcmToken({ uid: 'u1', vapidKey: 'vk' });
    expect(setDocMock).toHaveBeenCalled();
    const setArgs = setDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(JSON.stringify(setArgs[0])).toContain('users/u1');
    expect(JSON.stringify(setArgs[0])).toContain('fcmTokens');
    expect(setArgs[1]).toMatchObject({ token: 'abc-token', createdAt: expect.anything() });
  });

  it('registerFcmToken is a no-op when getToken returns null (permission denied)', async () => {
    getTokenMock.mockResolvedValue(null);
    await registerFcmToken({ uid: 'u1', vapidKey: 'vk' });
    expect(setDocMock).not.toHaveBeenCalled();
  });
});