import { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useBatch } from './useBatch';
import { pacePct } from './pace';
import { recomputeBatchStatus } from '@/features/batches/recomputeBatchStatus';

const COLORS: Record<string, string> = {
  'pre-start': '#94A3B8',
  'in-session': '#2E5A88',
  'exam-window': '#E0A458',
  'resulted': '#3F6B4E',
};

export function PaceCard({ batchId, now }: { batchId: string; now: Date }) {
  const { data: batch } = useBatch(batchId);
  const pct = useMemo(() => (batch ? pacePct(batch, now) : 0), [batch, now]);
  const status = useMemo(() => (batch ? recomputeBatchStatus(batch, now) : 'pre-start'), [batch, now]);
  const fill = COLORS[status] ?? '#2E5A88';

  return (
    <section className="rounded-lg bg-surface p-4 text-text shadow-sm">
      <h3 className="font-display text-lg">{batch?.label ?? '…'}</h3>
      <div className="h-48">
        <ResponsiveContainer>
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'pace', value: pct, fill }]} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#ECE7DE' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-2xl font-display">{pct}%</p>
      <p className="text-center text-text-dim capitalize">{status.replace('-', ' ')}</p>
    </section>
  );
}