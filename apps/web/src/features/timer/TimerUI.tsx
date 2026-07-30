import { useEffect, useState } from 'react';
import { useTimer } from './useTimer';
import { callSessionStart } from './serverAnchor';
import { Button } from '@/components/ui/Button';

function fmt(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const RING_SIZE = 280;
const RADIUS = (RING_SIZE - 12) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function TimerUI({ uid }: { uid: string }) {
  const t = useTimer({ uid });
  const [welcomeBack, setWelcomeBack] = useState(false);

  useEffect(() => {
    let lastHidden: number | null = null;
    const onVis = () => {
      if (document.visibilityState === 'hidden') lastHidden = Date.now();
      else if (lastHidden != null && Date.now() - lastHidden > 5_000) setWelcomeBack(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onStart = async () => {
    const startTs = Date.now();
    try { await callSessionStart(startTs); } catch { /* offline, retry later */ }
    t.start();
  };

  const progress = Math.min(1, t.elapsed / (60 * 60 * 1000)); // 1-hour dial max
  const dash = CIRC * progress;

  return (
    <div className="grid min-h-[60vh] place-items-center bg-bg text-text">
      <svg width={RING_SIZE} height={RING_SIZE} role="img" aria-label={`Elapsed ${fmt(t.elapsed)}`}>
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS} stroke="var(--surface-2)" strokeWidth={8} fill="none" />
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={RADIUS} stroke="var(--primary)" strokeWidth={8} fill="none"
                strokeDasharray={`${dash} ${CIRC - dash}`} strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE/2} ${RING_SIZE/2})`}
                className={t.status === 'running' ? 'animate-[breathe_4s_ease-in-out_infinite]' : ''} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-text font-display" fontSize="42">
          {fmt(t.elapsed)}
        </text>
      </svg>
      <div className="mt-6 flex gap-3">
        {t.status === 'idle' && <Button onClick={onStart}>Start</Button>}
        {t.status === 'running' && <Button onClick={t.pause}>Pause</Button>}
        {t.status === 'paused' && <Button onClick={t.resume}>Resume</Button>}
        {t.status !== 'idle' && <Button variant="danger" onClick={t.stop}>Stop</Button>}
      </div>
      {welcomeBack && <p role="status">Welcome back — your session is still running.</p>}
      <style>{`@keyframes breathe { 0%,100%{opacity:.9} 50%{opacity:1} }`}</style>
    </div>
  );
}
