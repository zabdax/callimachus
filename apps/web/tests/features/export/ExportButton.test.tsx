import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '@/features/export/ExportButton';

const downloadMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/export/exportMyData', () => ({
  downloadMyDataAsJson: (...args: unknown[]) => downloadMock(...args),
}));

describe('ExportButton', () => {
  it('renders with default English label', () => {
    render(<ExportButton />);
    expect(screen.getByRole('button', { name: /export my data/i })).toBeInTheDocument();
  });

  it('clicking calls downloadMyDataAsJson', async () => {
    render(<ExportButton />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalled();
    });
  });

  it('shows an error state if download rejects', async () => {
    downloadMock.mockRejectedValueOnce(new Error('No network'));
    render(<ExportButton />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/no network/i);
    });
  });
});