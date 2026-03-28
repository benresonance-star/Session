-- Run in Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.session_definitions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  title text not null default '',
  payload jsonb not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists session_definitions_updated_at_idx on public.session_definitions (updated_at desc);
create index if not exists session_definitions_sort_order_idx on public.session_definitions (sort_order);

alter table public.session_definitions enable row level security;
-- No policies: anon/authenticated cannot read/write. Service role (server) bypasses RLS.

-- After running this, add `.env.local` with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
-- Seed: open the app without env (uses bundled sample), edit in /builder/[id], click "save to Supabase",
-- or insert a row via Table Editor / SQL with valid session JSON in `payload`.

-- ---------------------------------------------------------------------------
-- Existing DB without sort_order: run migrate_add_sort_order.sql once
-- (Supabase → SQL → paste file contents → Run). Wait ~1 min or reload schema
-- in Dashboard if the API still caches the old shape.
-- ---------------------------------------------------------------------------
