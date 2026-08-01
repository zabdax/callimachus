import { callWorkerUnwrap } from '@/lib/workers/client';

export async function callSessionStart(clientStartTs: number): Promise<{ serverStartTs: number }> {
  return callWorkerUnwrap<{ clientStartTs: number }, { serverStartTs: number }>('sessionStart', { clientStartTs });
}