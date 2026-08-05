import { useCallback, useEffect, useState } from 'react';
import { callWorkerUnwrap } from '@/lib/workers/client';
import {
  fetchPendingRequests,
  type PendingRequest,
} from './fetchPendingRequests';

/**
 * /admin/approvals — admin-only list of paymentRequests with status=pending.
 * Each row has Approve / Reject buttons that call the corresponding Cloud
 * Functions. The list is refreshed after every action.
 */
export function ApprovalQueue() {
  const [items, setItems] = useState<PendingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const fresh = await fetchPendingRequests();
      setItems(fresh);
    } catch (e) {
      setError((e as Error).message || 'Failed to load.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        await callWorkerUnwrap<{ paymentRequestId: string }, { ok: boolean }>(
          'approvePayment',
          { paymentRequestId: id },
        );
        await refresh();
      } catch (e) {
        setError((e as Error).message || 'Approve failed.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  if (items === null) {
    return <p className="p-4 text-sm text-text-dim" role="status">Loading…</p>;
  }

  if (items.length === 0) {
    return <p className="p-4 text-sm text-text-dim">No pending requests.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 font-display text-2xl">Pending payment requests</h1>
      {error && (
        <div role="alert" className="mb-3 rounded-md bg-danger/10 text-danger p-3 text-sm">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-surface-2 bg-surface"><table className="w-full min-w-[38rem] text-sm border-collapse" data-testid="approval-table">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">TrxID</th>
            <th>UID</th>
            <th>Plan</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b">
              <td className="py-2 font-mono">{it.trxId}</td>
              <td className="font-mono text-xs text-slate-500">{it.uid}</td>
              <td>{it.planId}</td>
              <td>
                <button
                  type="button"
                  onClick={() => approve(it.id)}
                  disabled={busyId === it.id}
                  className="rounded-md bg-primary text-white px-3 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {busyId === it.id ? '…' : 'Approve'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}