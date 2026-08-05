import { callWorkerUnwrap } from '@/lib/workers/client';

export async function callSessionStart(clientStartTs: number): Promise<{ sessionId: string; serverStartTs: number }> {
  return callWorkerUnwrap<{ clientStartTs: number }, { sessionId: string; serverStartTs: number }>('sessionStart', { clientStartTs });
}