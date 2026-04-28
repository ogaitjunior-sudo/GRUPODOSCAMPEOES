do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'teams'
  ) then
    execute 'alter table public.teams add column if not exists flag_url text';
  end if;
end
$$;

update public.championship_workspaces
set teams = coalesce(
  (
    select jsonb_agg(
      case
        when jsonb_typeof(team_entry) = 'object' then
          team_entry
          || jsonb_build_object(
            'flagUrl',
            coalesce(team_entry->'flagUrl', 'null'::jsonb),
            'captainName',
            coalesce(team_entry->'captainName', 'null'::jsonb),
            'roster',
            case
              when jsonb_typeof(team_entry->'roster') = 'array' then team_entry->'roster'
              when nullif(trim(coalesce(team_entry->>'captainName', '')), '') is not null
                then jsonb_build_array(team_entry->>'captainName')
              else '[]'::jsonb
            end
          )
        else team_entry
      end
    )
    from jsonb_array_elements(teams) as team_entry
  ),
  '[]'::jsonb
)
where jsonb_typeof(teams) = 'array';

update public.admin_panel_state
set teams = coalesce(
  (
    select jsonb_agg(
      case
        when jsonb_typeof(team_entry) = 'object' then
          team_entry || jsonb_build_object('flagUrl', coalesce(team_entry->'flagUrl', 'null'::jsonb))
        else team_entry
      end
    )
    from jsonb_array_elements(teams) as team_entry
  ),
  '[]'::jsonb
)
where jsonb_typeof(teams) = 'array';
