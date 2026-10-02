// Seeds the curriculum table (bangla medium) via Supabase PostgREST.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seedSyllabus.mjs
import { SUBJECT_SEED } from '../src/features/syllabus/seedData.bangla.ts';

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

for (const s of SUBJECT_SEED) {
  const res = await fetch(`${url}/rest/v1/curriculum?on_conflict=medium,subject_id`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      medium: 'bangla',
      subject_id: s.subjectId,
      title: s.subjectName,
      chapters: s.chapters,
    }),
  });
  if (!res.ok) throw new Error(`seed curriculum/bangla/${s.subjectId} ${res.status} ${await res.text()}`);
  console.log(`Seeded curriculum/bangla/${s.subjectId}`);
}
