import { getAuth } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase/client';

/**
 * Thin wrapper that mirrors Firebase `httpsCallable` semantics against
 * a Cloudflare Worker deployment. Each call:
 *   - Reads the current Firebase ID token
 *   - POSTs to `${WORKERS_BASE}/api/<name>` with `{ data: ... }`
 *   - Returns `{ data: ... }` from the response body
 *
 * The Workers side responds with the same shape Cloud Functions use,
 * so the swap from `httpsCallable` to `callWorker` is mechanical.
 */

export const WORKERS_BASE =
  (import.meta.env.VITE_WORKERS_BASE as string | undefined) ??
  // Default to a same-origin relative path so this works on any host
  // (Cloudflare Pages custom domain, Firebase Hosting fallback, etc.).
  '';

export class WorkerError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function fetchIdToken(): Promise<string | null> {
  const u = getAuth(firebaseApp).currentUser;
  if (!u) return null;
  return u.getIdToken();
}

export async function callWorker<TReq, TRes>(
  name: string,
  req: TReq,
): Promise<{ data: TRes }> {
  const idToken = await fetchIdToken();
  const res = await fetch(`${WORKERS_BASE}/api/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data: req }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    data?: TRes;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new WorkerError(
      res.status,
      body.error ?? 'unknown',
      body.message ?? res.statusText,
    );
  }
  return { data: body.data as TRes };
}

/**
 * Convenience that unwraps the `{ data }` envelope — mirrors the
 * shape callers of `httpsCallable` already used.
 */
export async function callWorkerUnwrap<TReq, TRes>(name: string, req: TReq): Promise<TRes> {
  const out = await callWorker<TReq, TRes>(name, req);
  return out.data;
}