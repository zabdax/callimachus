export type AnchorRecord = { startTs: number; pausedAccumMs: number; serverStartTs: number; sessionId?: string };

const LS_KEY = (uid: string) => `hsc:timer:${uid}`;

export function saveAnchor(uid: string, a: AnchorRecord) {
  localStorage.setItem(LS_KEY(uid), JSON.stringify(a));
}

export function loadAnchor(uid: string): AnchorRecord | null {
  const raw = localStorage.getItem(LS_KEY(uid));
  if (!raw) return null;
  try { return JSON.parse(raw) as AnchorRecord; } catch { return null; }
}

export function clearAnchor(uid: string) {
  localStorage.removeItem(LS_KEY(uid));
}
