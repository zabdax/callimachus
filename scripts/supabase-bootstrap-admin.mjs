// Grants admin to a Supabase user: sets app_metadata.admin=true via the Auth
// Admin API and inserts a row into `admins` (used by RLS admin policies).
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/supabase-bootstrap-admin.mjs <user-email|uid>
//
// After running, the user must sign out and back in so the new app_metadata
// lands in their access token.

const url = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? '';
const idOrEmail = process.argv[2];

if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required.');
  process.exit(1);
}
if (!idOrEmail) {
  console.error('Usage: node scripts/supabase-bootstrap-admin.mjs <user-email|uid>');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
};

async function adminFetch(path, opts = {}) {
  const res = await fetch(`${url}/auth/v1/admin${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`auth admin ${path} ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function rest(method, path, body) {
  const res = await fetch(`${url}/rest/v1${path}`, {
    method,
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rest ${path} ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Resolve email -> uid when needed.
let uid = idOrEmail;
if (!/^[0-9a-f-]{36}$/i.test(idOrEmail)) {
  const found = await adminFetch(`/users?email=${encodeURIComponent(idOrEmail)}`);
  const users = found?.users ?? [];
  if (users.length === 0) throw new Error(`no user with email ${idOrEmail}`);
  uid = users[0].id;
}

// Merge admin:true into existing app_metadata (never clobber other keys).
const user = await adminFetch(`/users/${uid}`);
const appMetadata = { ...(user?.app_metadata ?? {}), admin: true };
await adminFetch(`/users/${uid}`, { method: 'PUT', body: JSON.stringify({ app_metadata: appMetadata }) });

await rest('POST', '/admins?on_conflict=uid', { uid });

console.log(`admin granted: ${uid} (sign out + back in to refresh the token)`);
