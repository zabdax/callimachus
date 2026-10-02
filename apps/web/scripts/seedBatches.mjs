// Seeds the batches table via Supabase PostgREST (service key bypasses RLS).
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seedBatches.mjs
import { BATCH_SEED } from '../src/features/batches/seedData.ts';

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

for (const b of BATCH_SEED) {
  const res = await fetch(`${url}/rest/v1/batches?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: b.id,
      label: b.label,
      college_start: b.collegeStart.toISOString(),
      exam_start: b.examStart.toISOString(),
      exam_end: b.examEnd.toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`seed batches/${b.id} ${res.status} ${await res.text()}`);
  console.log(`Seeded batches/${b.id}`);
}
