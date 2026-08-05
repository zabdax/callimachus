import { useEffect, useState } from 'react';
import { useTimer } from './useTimer';
import { stopAndSubmit } from './stopAndSubmit';
import { Button } from '@/components/ui/Button';

function fmt(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
const RING_SIZE = 280;
const RADIUS = (RING_SIZE - 12) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function TimerUI({ uid }: { uid: string }) {
  const timer = useTimer({ uid });
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { (window as { __hscUid?: string }).__hscUid = uid; }, [uid]);
  const stop = async () => {
    if (!timer.record || timer.status === 'idle') return;
    setBusy(true); setNotice(null);
    try {
      if (!timer.record.sessionId) throw new Error('This session needs to restart before it can be saved.');
      const result = await stopAndSubmit({ id: crypto.randomUUID(), uid, sessionId: timer.record.sessionId, clientStartTs: timer.record.startTs, clientEndedTs: Date.now(), serverStartTs: timer.record.serverStartTs, chapterId: null });
      timer.reset();
      setNotice('queued' in result && result.queued ? 'Saved offline. It will submit when you reconnect.' : 'Study session saved.');
    } catch (error) { setNotice((error as Error).message || 'Could not save this session.'); }
    finally { setBusy(false); }
  };
  const progress = Math.min(1, timer.elapsed / 3_600_000);
  const dash = CIRC * progress;
  return (
    <main className="grid min-h-[60vh] place-items-center gap-6 bg-bg p-4 text-text">
      <div className="text-center"><h1 className="font-display text-2xl">Focus session</h1><p className="mt-1 text-sm text-text-dim">Keep the timer running while you study.</p></div>
      <svg width={RING_SIZE} height={RING_SIZE} role="img" aria-label={`Elapsed ${fmt(timer.elapsed)}`}>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="var(--surface-2)" strokeWidth={8} fill="none" />
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke="var(--primary)" strokeWidth={8} fill="none" strokeDasharray={`${dash} ${CIRC - dash}`} strokeLinecap="round" transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-text font-display" fontSize="42">{fmt(timer.elapsed)}</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {timer.status === 'idle' && <Button onClick={() => void timer.start()} disabled={busy}>Start</Button>}
        {timer.status === 'running' && <Button onClick={timer.pause}>Pause</Button>}
        {timer.status === 'paused' && <Button onClick={timer.resume}>Resume</Button>}
        {timer.status !== 'idle' && <Button variant="danger" onClick={() => void stop()} disabled={busy}>{busy ? 'Saving…' : 'Finish & save'}</Button>}
      </div>
      {notice && <p role="status" className="rounded-md bg-surface-2 px-3 py-2 text-sm">{notice}</p>}
    </main>
  );
}
