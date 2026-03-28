-- Run in Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.session_definitions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  title text not null default '',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists session_definitions_updated_at_idx on public.session_definitions (updated_at desc);

alter table public.session_definitions enable row level security;
-- No policies: anon/authenticated cannot read/write. Service role (server) bypasses RLS.

-- After running this, add `.env.local` with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
-- Seed: open the app without env (uses bundled sample), edit in /builder/[id], click "save to Supabase",
-- or insert a row via Table Editor / SQL with valid session JSON in `payload`.
