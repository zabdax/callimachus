import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/client';

export type UserExport = {
  profile: Record<string, unknown> | null;
  syllabus: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
  exportedAt: number;
};

/**
 * Calls the `getUserData` Cloud Function and returns the export.
 * Throws on auth error — caller decides UX.
 */
export async function exportMyData(): Promise<UserExport> {
  const fn = httpsCallable<Record<string, never>, UserExport>(
    getFunctions(app),
    'getUserData',
  );
  const { data } = await fn({});
  return data;
}

/**
 * Triggers a JSON file download of the user's exported data.
 */
export async function downloadMyDataAsJson(): Promise<void> {
  const data = await exportMyData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hsc-tracker-export-${new Date(data.exportedAt).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}