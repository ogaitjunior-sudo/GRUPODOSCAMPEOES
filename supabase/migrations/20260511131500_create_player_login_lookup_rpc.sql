create or replace function public.normalize_player_login_identifier(value text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(
        trim(both from regexp_replace(coalesce(value, ''), '^@+', '')),
        '[_\.-]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.resolve_player_login_email(p_identifier text)
returns table(email text, match_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_identifier text;
begin
  normalized_identifier := public.normalize_player_login_identifier(p_identifier);

  return query
  with matches as (
    select distinct lower(player_accounts.email) as email
    from public.player_accounts
    where public.normalize_player_login_identifier(player_accounts.name) = normalized_identifier
       or public.normalize_player_login_identifier(player_accounts.email) = normalized_identifier
  )
  select min(matches.email), count(*)::integer
  from matches;
end;
$$;

grant execute on function public.normalize_player_login_identifier(text) to anon, authenticated;
grant execute on function public.resolve_player_login_email(text) to anon, authenticated;

notify pgrst, 'reload schema';
