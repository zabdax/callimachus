import { useState } from 'react';
import { useTimeBlocks } from './useTimeBlocks';
import type { TimeBlock } from './blocks';

const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 06:00 .. 23:00

function todayKey(): string {
  // BST date YYYY-MM-DD using Intl with explicit timeZone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
}

export function TimeBlockTimeline({ uid }: { uid: string }) {
  const date = todayKey();
  const { data: blocks = [], add, complete } = useTimeBlocks(uid, date);
  const [picked, setPicked] = useState<{ startHour: number; durationMin: number } | null>(null);

  const onSlotClick = (h: number) => {
    setPicked({ startHour: h, durationMin: 30 });
  };

  const onAdd = (subjectId: string, chapterId: string) => {
    if (!picked) return;
    add.mutate({ date, startHour: picked.startHour, durationMin: picked.durationMin, subjectId, chapterId, source: 'manual' });
    setPicked(null);
  };

  return (
    <div className="grid grid-cols-[60px_1fr] gap-2 p-4">
      {HOURS.map((h) => (
        <div key={h} className="contents">
          <div className="text-text-dim text-sm">{String(h).padStart(2, '0')}:00</div>
          <button onClick={() => onSlotClick(h)} className="rounded border border-surface-2 bg-surface p-2 text-left text-text">
            {blocks.filter((b: TimeBlock) => b.startHour === h).map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <span>{b.subjectId} · {b.chapterId}</span>
                {b.completedAt
                  ? <span className="text-success">✓</span>
                  : <button onClick={(e) => { e.stopPropagation(); complete.mutate(b.id); }} className="text-primary">complete</button>}
              </div>
            ))}
            {picked?.startHour === h && <span className="text-text-dim">+ new 30m</span>}
          </button>
        </div>
      ))}
      {picked && (
        <div className="col-span-2 rounded bg-surface-2 p-2">
          <p>Add a 30m block at {String(picked.startHour).padStart(2, '0')}:00</p>
          <input id="sbj" placeholder="subjectId" className="rounded border p-1" />
          <input id="chp" placeholder="chapterId" className="rounded border p-1" />
          <button onClick={() => onAdd((document.getElementById('sbj') as HTMLInputElement).value, (document.getElementById('chp') as HTMLInputElement).value)} className="ml-2 rounded bg-primary px-2 text-white">Add</button>
        </div>
      )}
    </div>
  );
}
