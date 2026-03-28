-- Run once in Supabase: Dashboard → SQL → New query → Run
-- Fixes: "Could not find the 'sort_order' column of 'session_definitions' in the schema cache"

alter table public.session_definitions
  add column if not exists sort_order integer;

-- Assign order from current title sort (only rows still null; safe to re-run)
update public.session_definitions s
set sort_order = r.ord
from (
  select id, row_number() over (order by title asc) - 1 as ord
  from public.session_definitions
) r
where s.id = r.id
  and s.sort_order is null;

update public.session_definitions
set sort_order = 0
where sort_order is null;

alter table public.session_definitions
  alter column sort_order set default 0,
  alter column sort_order set not null;

create index if not exists session_definitions_sort_order_idx
  on public.session_definitions (sort_order);

-- PostgREST schema cache usually updates within ~1 minute. If errors persist, try:
-- Supabase Dashboard → Settings → API → "Reload schema" (wording may vary), or pause/resume project.
