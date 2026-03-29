-- Run in Supabase SQL Editor (Dashboard -> SQL -> New query).

create table if not exists public.lcd_tuning_profiles (
  profile_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists lcd_tuning_profiles_updated_at_idx on public.lcd_tuning_profiles (updated_at desc);

alter table public.lcd_tuning_profiles enable row level security;
-- No policies: anon/authenticated cannot read/write. Service role (server) bypasses RLS.

insert into public.lcd_tuning_profiles (profile_key, payload)
values ('global', '{}'::jsonb)
on conflict (profile_key) do nothing;
