import { useState } from 'react';
import { downloadMyDataAsJson } from './exportMyData';

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadMyDataAsJson();
    } catch (e) {
      setError((e as Error).message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Exporting…' : 'Export my data'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}