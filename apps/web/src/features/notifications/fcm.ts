import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';

export type RegisterFcmInput = { uid: string; vapidKey: string };

/**
 * Asks the browser for Notification permission and returns the resulting
 * permission string ('granted' | 'denied' | 'default').
 *
 * Returns 'default' when the Notification API is unavailable (e.g. iOS Safari
 * without PWA mode).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'default';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * Registers an FCM token under users/{uid}/fcmTokens/{token} in Firestore.
 * No-op when getToken returns null (permission denied or unavailable).
 */
export async function registerFcmToken(input: RegisterFcmInput): Promise<string | null> {
  const messaging = getMessaging(app);
  const tk = await getToken(messaging, { vapidKey: input.vapidKey });
  if (!tk) return null;

  const db = getFirestore(app);
  await setDoc(doc(db, 'users', input.uid, 'fcmTokens', tk), {
    token: tk,
    createdAt: serverTimestamp(),
  });
  return tk;
}

/**
 * Subscribes to foreground FCM messages. Returns the unsubscribe function.
 */
export function listenForForegroundMessages(
  handler: (payload: unknown) => void,
): () => void {
  const messaging = getMessaging(app);
  return onMessage(messaging, handler as Parameters<typeof onMessage>[1]);
}