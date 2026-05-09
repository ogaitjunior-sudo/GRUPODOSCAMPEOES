create table if not exists public.player_accounts (
  id text primary key,
  auth_user_id text,
  name text not null,
  email text not null unique,
  provider text not null default 'supabase',
  created_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_player_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_player_accounts_updated_at on public.player_accounts;

create trigger set_player_accounts_updated_at
before update on public.player_accounts
for each row
execute function public.set_player_accounts_updated_at();

create index if not exists player_accounts_email_idx
  on public.player_accounts (email);

create index if not exists player_accounts_created_at_idx
  on public.player_accounts (created_at desc);

alter table public.player_accounts enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.player_accounts to authenticated;
grant insert, update on public.player_accounts to anon, authenticated;

drop policy if exists "Authenticated read player accounts" on public.player_accounts;
create policy "Authenticated read player accounts"
on public.player_accounts
for select
to authenticated
using (true);

drop policy if exists "Public insert player accounts" on public.player_accounts;
create policy "Public insert player accounts"
on public.player_accounts
for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update player accounts" on public.player_accounts;
create policy "Public update player accounts"
on public.player_accounts
for update
to anon, authenticated
using (true)
with check (true);

insert into public.player_accounts (
  id,
  auth_user_id,
  name,
  email,
  provider,
  created_at,
  last_login_at
)
select
  'player-account-' || users.id::text,
  users.id::text,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'player_name', ''),
    nullif(users.raw_user_meta_data ->> 'display_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    split_part(users.email, '@', 1)
  ),
  lower(users.email),
  'supabase',
  users.created_at,
  users.last_sign_in_at
from auth.users as users
where users.email is not null
  and lower(users.email) <> 'admin@grupodecampeoes.com'
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  name = excluded.name,
  last_login_at = coalesce(excluded.last_login_at, public.player_accounts.last_login_at),
  updated_at = timezone('utc', now());
