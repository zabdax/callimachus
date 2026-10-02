-- 0001_init.sql — Supabase migration (fresh start, no data import).
-- Mirrors the Firestore collections used by apps/workers + apps/web.
-- Service-role key (worker) bypasses RLS; policies below constrain the
-- anon/authenticated client used directly by the web app.

-- === profiles (1 row per auth user, id = auth.users.id) ===
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  college text not null check (char_length(college) between 1 and 80),
  batch_id text not null check (char_length(batch_id) between 1 and 40),
  medium text not null check (medium in ('bangla', 'english')),
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === study_sessions (server-verified focus sessions) ===
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users (id) on delete cascade,
  date text not null,
  duration_sec integer not null check (duration_sec > 0),
  started_at_ms bigint,
  ended_at_ms bigint,
  chapters jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index study_sessions_uid_date_idx on study_sessions (uid, date);

-- === curriculum (static NCTB syllabus; seeded via SQL, read-only clients) ===
create table curriculum (
  medium text not null check (medium in ('bangla', 'english')),
  subject_id text not null,
  title text not null default '',
  chapters jsonb not null default '[]',
  primary key (medium, subject_id)
);

-- === syllabus_progress (per-user per-subject chapter state map) ===
create table syllabus_progress (
  uid uuid not null references auth.users (id) on delete cascade,
  subject_id text not null,
  chapters jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (uid, subject_id)
);

-- === tracked_subjects (per-user selected subjects) ===
create table tracked_subjects (
  uid uuid primary key references auth.users (id) on delete cascade,
  subject_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users (id) on delete cascade,
  subject_id text not null default '',
  subject_name text,
  chapter_id text,
  chapter_name text,
  type text not null default 'custom',
  source text not null default 'manual',
  status text not null default 'pending',
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index tasks_uid_idx on tasks (uid);

-- === daily_plans + time_blocks (uid-scoped planning data) ===
create table daily_plans (
  uid uuid not null references auth.users (id) on delete cascade,
  date text not null,
  tasks jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (uid, date)
);
create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users (id) on delete cascade,
  date text not null,
  start_hour integer not null check (start_hour between 0 and 23),
  duration_min integer not null check (duration_min > 0),
  subject_id text not null default '',
  chapter_id text not null default '',
  completed_at timestamptz,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
create index time_blocks_uid_date_idx on time_blocks (uid, date);

-- === batches (read by clients, written by worker/admin only) ===
create table batches (
  id text primary key,
  label text not null default '',
  college_start timestamptz,
  exam_start timestamptz,
  exam_end timestamptz,
  status text,
  updated_at timestamptz not null default now()
);

-- === payment_requests (TrxID flow; client inserts pending only) ===
create table payment_requests (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (plan_id in ('1m', '3m', '6m', '12m')),
  trx_id text not null check (trx_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at bigint,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_requests_pending_idx on payment_requests (status, created_at)
  where status = 'pending';

-- === leaderboards (written by worker only) ===
create table leaderboard_daily (
  date text primary key,
  total_duration_sec integer not null default 0,
  active_user_count integer not null default 0
);
create table leaderboard_daily_users (
  date text not null,
  uid uuid not null,
  duration_sec integer not null default 0,
  primary key (date, uid)
);
create table leaderboard_monthly (
  month text primary key,
  total_duration_sec integer not null default 0,
  active_user_count integer not null default 0
);
create table leaderboard_monthly_users (
  month text not null,
  uid uuid not null,
  duration_sec integer not null default 0,
  primary key (month, uid)
);

-- === audit_log (worker/admin only) ===
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target text not null,
  after jsonb not null default '{}',
  at_ms bigint not null,
  created_at timestamptz not null default now()
);

-- === admins (worker-checked; client cannot write) ===
create table admins (
  uid uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- === subscriptions (worker-written; client reads own only) ===
create table subscriptions (
  uid uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('active', 'inactive', 'expired')),
  plan text not null,
  expires_at bigint not null,
  payment_request_id text not null default '',
  updated_at timestamptz not null default now()
);

-- === active_sessions (single live timer per user; worker only) ===
create table active_sessions (
  uid uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  server_start_ts bigint not null,
  client_start_ts bigint not null,
  updated_at timestamptz not null default now()
);

-- === chapter_stats (worker-maintained aggregates) ===
create table chapter_stats (
  uid uuid not null references auth.users (id) on delete cascade,
  chapter_id text not null,
  total_sec integer not null default 0,
  last_studied_at timestamptz not null default now(),
  primary key (uid, chapter_id)
);

-- === user_settings (per-user settings blob) ===
create table user_settings (
  uid uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- === Row Level Security ===
alter table profiles enable row level security;
alter table curriculum enable row level security;
alter table syllabus_progress enable row level security;
alter table tracked_subjects enable row level security;
alter table study_sessions enable row level security;
alter table tasks enable row level security;
alter table daily_plans enable row level security;
alter table time_blocks enable row level security;
alter table batches enable row level security;
alter table payment_requests enable row level security;
alter table leaderboard_daily enable row level security;
alter table leaderboard_daily_users enable row level security;
alter table leaderboard_monthly enable row level security;
alter table leaderboard_monthly_users enable row level security;
alter table audit_log enable row level security;
alter table admins enable row level security;
alter table subscriptions enable row level security;
alter table active_sessions enable row level security;
alter table chapter_stats enable row level security;
alter table user_settings enable row level security;

-- Owner-only access for uid-scoped tables.
create policy profiles_owner on profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Static curriculum readable by any signed-in user; seeded via SQL.
create policy curriculum_read on curriculum
  for select to authenticated using (true);
create policy syllabus_progress_owner on syllabus_progress
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy tracked_subjects_owner on tracked_subjects
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy study_sessions_owner on study_sessions
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy tasks_owner on tasks
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy daily_plans_owner on daily_plans
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy time_blocks_owner on time_blocks
  for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

-- Batches + leaderboard totals readable by any signed-in user; writes via
-- service key only (no client policy for insert/update/delete).
create policy batches_read on batches for select to authenticated using (true);
create policy leaderboard_daily_read on leaderboard_daily
  for select to authenticated using (true);
create policy leaderboard_monthly_read on leaderboard_monthly
  for select to authenticated using (true);
create policy leaderboard_daily_users_owner on leaderboard_daily_users
  for select to authenticated using (uid = auth.uid());
create policy leaderboard_monthly_users_owner on leaderboard_monthly_users
  for select to authenticated using (uid = auth.uid());

-- Payment requests: client may insert its own pending rows and read its own;
-- approval (update) happens via service key only.
create policy payment_requests_insert on payment_requests
  for insert to authenticated with check (uid = auth.uid() and status = 'pending');
create policy payment_requests_read on payment_requests
  for select to authenticated using (uid = auth.uid());
-- Admins (uid present in admins table) may read all payment requests and
-- per-user leaderboard rows for review screens. Writes stay service-key only.
create policy payment_requests_admin_read on payment_requests
  for select to authenticated using (exists (select 1 from admins where uid = auth.uid()));
create policy leaderboard_daily_users_admin_read on leaderboard_daily_users
  for select to authenticated using (exists (select 1 from admins where uid = auth.uid()));
create policy leaderboard_monthly_users_admin_read on leaderboard_monthly_users
  for select to authenticated using (exists (select 1 from admins where uid = auth.uid()));

-- audit_log: no client access at all (service key bypasses RLS).

-- Admins: a signed-in user may read only their own row (used by admin
-- screens to detect privilege); all writes via service key.
create policy admins_self_read on admins
  for select to authenticated using (uid = auth.uid());

-- Subscriptions + settings: read-own only; writes via service key so a
-- client can never escalate its own plan or role.
create policy subscriptions_read_own on subscriptions
  for select to authenticated using (uid = auth.uid());
create policy user_settings_owner_read on user_settings
  for select to authenticated using (uid = auth.uid());

-- active_sessions / chapter_stats: worker-maintained, no client access.
