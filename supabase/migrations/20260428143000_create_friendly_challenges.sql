create table if not exists public.friendly_challenges (
  id uuid primary key default gen_random_uuid(),
  championship_id text references public.championships (id) on delete set null,
  championship_name text,
  from_team_id text not null,
  to_team_id text not null,
  from_player_id text,
  from_player_email text,
  to_player_id text,
  to_player_email text,
  from_team_name text not null,
  to_team_name text not null,
  from_flag_url text,
  to_flag_url text,
  date text not null,
  time text not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint friendly_challenges_date_check check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  constraint friendly_challenges_time_check check (time ~ '^[0-9]{2}:[0-9]{2}$'),
  constraint friendly_challenges_status_check check (status in ('pending', 'accepted', 'rejected')),
  constraint friendly_challenges_self_challenge_check check (from_team_id <> to_team_id)
);

create index if not exists friendly_challenges_championship_idx
  on public.friendly_challenges (championship_id);

create index if not exists friendly_challenges_status_created_idx
  on public.friendly_challenges (status, created_at desc);

create index if not exists friendly_challenges_players_idx
  on public.friendly_challenges (from_player_id, to_player_id);

create index if not exists friendly_challenges_player_emails_idx
  on public.friendly_challenges (from_player_email, to_player_email);

create unique index if not exists friendly_challenges_pending_pair_idx
  on public.friendly_challenges (
    coalesce(championship_id, ''),
    least(from_team_id, to_team_id),
    greatest(from_team_id, to_team_id)
  )
  where status = 'pending';

create or replace function public.set_friendly_challenge_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_friendly_challenge_updated_at on public.friendly_challenges;

create trigger set_friendly_challenge_updated_at
before update on public.friendly_challenges
for each row
execute function public.set_friendly_challenge_updated_at();

alter table public.friendly_challenges enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.friendly_challenges to anon, authenticated;
grant insert, update on public.friendly_challenges to authenticated;

drop policy if exists "Public read friendly challenges" on public.friendly_challenges;
create policy "Public read friendly challenges"
on public.friendly_challenges
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated insert friendly challenges" on public.friendly_challenges;
create policy "Authenticated insert friendly challenges"
on public.friendly_challenges
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated update friendly challenges" on public.friendly_challenges;
create policy "Authenticated update friendly challenges"
on public.friendly_challenges
for update
to authenticated
using (true)
with check (true);
