create table if not exists public.championship_workspaces (
  championship_id text primary key references public.championships (id) on delete cascade,
  teams jsonb not null default '[]'::jsonb,
  groups jsonb not null default '[]'::jsonb,
  group_matches jsonb not null default '[]'::jsonb,
  bracket jsonb not null default '{}'::jsonb,
  scoring jsonb not null default '{"winPoints":3,"drawPoints":1,"lossPoints":0}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_championship_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_championship_workspace_updated_at on public.championship_workspaces;

create trigger set_championship_workspace_updated_at
before update on public.championship_workspaces
for each row
execute function public.set_championship_workspace_updated_at();

alter table public.championship_workspaces enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.championship_workspaces to anon, authenticated;
grant insert, update, delete on public.championship_workspaces to authenticated;

drop policy if exists "Public read championship workspaces" on public.championship_workspaces;
create policy "Public read championship workspaces"
on public.championship_workspaces
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated insert championship workspaces" on public.championship_workspaces;
create policy "Authenticated insert championship workspaces"
on public.championship_workspaces
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated update championship workspaces" on public.championship_workspaces;
create policy "Authenticated update championship workspaces"
on public.championship_workspaces
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated delete championship workspaces" on public.championship_workspaces;
create policy "Authenticated delete championship workspaces"
on public.championship_workspaces
for delete
to authenticated
using (true);
