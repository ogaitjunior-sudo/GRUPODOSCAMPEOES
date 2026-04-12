create table if not exists public.championships (
  id text primary key,
  name text not null,
  description text not null,
  start_date date not null,
  end_date date not null,
  team_count integer not null check (team_count >= 2),
  rules text not null,
  status text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint championships_date_order check (end_date >= start_date)
);

alter table public.championships
  add column if not exists configuration jsonb not null default '{}'::jsonb;

create index if not exists championships_start_date_idx
  on public.championships (start_date asc);

create index if not exists championships_status_idx
  on public.championships (status);

create or replace function public.set_championship_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_championship_updated_at on public.championships;

create trigger set_championship_updated_at
before update on public.championships
for each row
execute function public.set_championship_updated_at();

alter table public.championships enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.championships to anon, authenticated;
grant insert, update, delete on public.championships to authenticated;

drop policy if exists "Public read championships" on public.championships;
create policy "Public read championships"
on public.championships
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated insert championships" on public.championships;
create policy "Authenticated insert championships"
on public.championships
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated update championships" on public.championships;
create policy "Authenticated update championships"
on public.championships
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated delete championships" on public.championships;
create policy "Authenticated delete championships"
on public.championships
for delete
to authenticated
using (true);
