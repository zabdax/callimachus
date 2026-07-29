import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

export async function callSessionStart(clientStartTs: number): Promise<{ serverStartTs: number }> {
  const fn = httpsCallable<{ clientStartTs: number }, { serverStartTs: number }>(getFunctions(app), 'sessionStart');
  const res = await fn({ clientStartTs });
  return res.data;
}
