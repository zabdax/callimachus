import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/features/admin/useIsAdmin', () => ({
  useIsAdmin: () => true,
}));

vi.mock('@/features/admin/fetchPendingRequests', () => ({
  fetchPendingRequests: vi.fn().mockResolvedValue([
    { id: 'pr1', uid: 'u1', planId: '3m', status: 'pending', trxId: 'TXN1' },
    { id: 'pr2', uid: 'u2', planId: '6m', status: 'pending', trxId: 'TXN2' },
  ]),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { getIdToken: async () => 't' } }),
}));

vi.mock('@/lib/firebase/client', () => ({ app: { _app: true } }));

import { ApprovalQueue } from '@/features/admin/ApprovalQueue';

describe('ApprovalQueue', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { ok: true } }) });
  });

  it('renders a row for each pending request', async () => {
    render(<ApprovalQueue />);
    await waitFor(() => {
      expect(screen.getByText('TXN1')).toBeInTheDocument();
    });
    expect(screen.getByText('TXN2')).toBeInTheDocument();
  });

  it('calls approvePayment on Approve click and refreshes', async () => {
    render(<ApprovalQueue />);
    await waitFor(() => screen.getByText('TXN1'));
    const approveButtons = screen.getAllByRole('button', { name: /approve/i });
    const first = approveButtons[0];
    expect(first).toBeDefined();
    fireEvent.click(first!);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('renders an empty queue without erroring', async () => {
    // Re-mock fetchPendingRequests to return []. Done by re-importing.
    const mod = await import('@/features/admin/fetchPendingRequests');
    (mod.fetchPendingRequests as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    render(<ApprovalQueue />);
    await waitFor(() =>
      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument(),
    );
  });
});