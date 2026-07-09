create table if not exists public.search_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  filters jsonb not null,
  query text,
  operation text,
  property_type text,
  price_range text,
  bedrooms text,
  bathrooms text,
  parking text,
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists search_alerts_user_created_idx
  on public.search_alerts (user_id, created_at desc);

create index if not exists search_alerts_active_idx
  on public.search_alerts (is_active, last_sent_at)
  where is_active = true;

create or replace function public.set_search_alerts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_search_alerts_updated_at on public.search_alerts;
create trigger set_search_alerts_updated_at
before update on public.search_alerts
for each row
execute function public.set_search_alerts_updated_at();

alter table public.search_alerts enable row level security;

drop policy if exists "search_alerts_select_own" on public.search_alerts;
create policy "search_alerts_select_own"
on public.search_alerts
for select
using (auth.uid() = user_id);

drop policy if exists "search_alerts_insert_own" on public.search_alerts;
create policy "search_alerts_insert_own"
on public.search_alerts
for insert
with check (auth.uid() = user_id);

drop policy if exists "search_alerts_update_own" on public.search_alerts;
create policy "search_alerts_update_own"
on public.search_alerts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "search_alerts_delete_own" on public.search_alerts;
create policy "search_alerts_delete_own"
on public.search_alerts
for delete
using (auth.uid() = user_id);
