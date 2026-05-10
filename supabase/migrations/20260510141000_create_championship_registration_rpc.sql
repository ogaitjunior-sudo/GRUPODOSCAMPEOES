create or replace function public.submit_championship_registration(
  p_championship_id text,
  p_request_id text,
  p_player_id text,
  p_player_name text,
  p_player_email text,
  p_requested_at timestamptz default timezone('utc', now())
)
returns public.championships
language plpgsql
security definer
set search_path = public
as $$
declare
  championship_row public.championships%rowtype;
  configuration_payload jsonb;
  settings_payload jsonb;
  registration_requests jsonb;
  next_request jsonb;
  occupied_slots integer;
  has_existing_request boolean;
begin
  select *
  into championship_row
  from public.championships
  where id = p_championship_id
  for update;

  if not found then
    raise exception 'Campeonato nao encontrado.';
  end if;

  if championship_row.status <> 'REGISTRATION' then
    raise exception 'Este campeonato nao esta aceitando pedidos no momento.';
  end if;

  configuration_payload := coalesce(championship_row.configuration, '{}'::jsonb);

  if configuration_payload ? 'settings' then
    settings_payload := coalesce(configuration_payload -> 'settings', '{}'::jsonb);
    registration_requests := coalesce(configuration_payload -> 'registrationRequests', '[]'::jsonb);
  else
    settings_payload := configuration_payload;
    registration_requests := '[]'::jsonb;
  end if;

  if coalesce(settings_payload ->> 'registrationMode', 'private') <> 'public' then
    raise exception 'Este campeonato usa entrada privada pela organizacao.';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(registration_requests) as request_entry
    where request_entry ->> 'playerId' = p_player_id
      or lower(coalesce(request_entry ->> 'playerEmail', '')) = lower(trim(p_player_email))
  )
  into has_existing_request;

  if has_existing_request then
    return championship_row;
  end if;

  select count(*)
  into occupied_slots
  from jsonb_array_elements(registration_requests) as request_entry
  where request_entry ->> 'status' in ('approved', 'pending');

  if occupied_slots >= championship_row.team_count then
    raise exception 'O limite maximo de participantes deste campeonato ja foi atingido.';
  end if;

  next_request := jsonb_build_object(
    'id', p_request_id,
    'playerId', p_player_id,
    'playerName', coalesce(nullif(trim(p_player_name), ''), 'Jogador'),
    'playerEmail', lower(trim(p_player_email)),
    'status', 'pending',
    'requestedAt', to_char(p_requested_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'reviewedAt', null,
    'reviewedBy', null
  );

  update public.championships
  set
    configuration = jsonb_build_object(
      'settings', settings_payload,
      'registrationRequests', jsonb_build_array(next_request) || registration_requests
    ),
    updated_at = timezone('utc', now())
  where id = p_championship_id
  returning *
  into championship_row;

  return championship_row;
end;
$$;

grant execute on function public.submit_championship_registration(
  text,
  text,
  text,
  text,
  text,
  timestamptz
) to authenticated;
