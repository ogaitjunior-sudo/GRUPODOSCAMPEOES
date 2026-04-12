create table if not exists public.admin_panel_state (
  id text primary key,
  users jsonb not null default '[]'::jsonb,
  players jsonb not null default '[]'::jsonb,
  teams jsonb not null default '[]'::jsonb,
  championships jsonb not null default '[]'::jsonb,
  image_requests jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  tickets jsonb not null default '[]'::jsonb,
  audit_logs jsonb not null default '[]'::jsonb,
  error_logs jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_admin_panel_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_admin_panel_state_updated_at on public.admin_panel_state;

create trigger set_admin_panel_state_updated_at
before update on public.admin_panel_state
for each row
execute function public.set_admin_panel_state_updated_at();

insert into public.admin_panel_state (
  id,
  settings
)
values (
  'primary',
  '{
    "siteName": "Grupo de Campeoes X1 UT",
    "logoUrl": "/src/assets/logo-gc-fc26.png",
    "faviconUrl": "/favicon.ico",
    "primaryColor": "#ffcc00",
    "accentColor": "#00b8ff",
    "institutionalText": "Painel interno para operacao de campeonatos X1 de Ultimate Team, validacao de contas e acompanhamento do circuito competitivo.",
    "platformStatus": "healthy",
    "seoTitle": "Grupo de Campeoes X1 UT | Circuito oficial",
    "seoDescription": "Plataforma competitiva com campeonatos X1 de Ultimate Team, ranking, perfis de jogadores e operacao interna dedicada.",
    "socialLinks": {
      "discord": "https://discord.gg/grupodecampeoes",
      "instagram": "https://instagram.com/grupodecampeoes",
      "youtube": "https://youtube.com/@grupodecampeoes",
      "twitch": "https://twitch.tv/grupodecampeoes"
    },
    "registrationMode": "approval_only",
    "maintenanceMode": false,
    "allowImageUploads": true,
    "banners": [],
    "staticPages": []
  }'::jsonb
)
on conflict (id) do nothing;

alter table public.admin_panel_state enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.admin_panel_state to anon, authenticated;

drop policy if exists "Public read admin panel state" on public.admin_panel_state;
create policy "Public read admin panel state"
on public.admin_panel_state
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert admin panel state" on public.admin_panel_state;
create policy "Public insert admin panel state"
on public.admin_panel_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update admin panel state" on public.admin_panel_state;
create policy "Public update admin panel state"
on public.admin_panel_state
for update
to anon, authenticated
using (true)
with check (true);
