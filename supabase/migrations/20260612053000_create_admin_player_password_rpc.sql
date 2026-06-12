create or replace function public.admin_set_player_password(
  p_user_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if caller_email <> 'admin@grupodecampeoes.com' then
    raise exception 'Esta sessao nao possui permissao para alterar senhas.';
  end if;

  if p_password is null or length(trim(p_password)) < 8 then
    raise exception 'A nova senha precisa ter pelo menos 8 caracteres.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(trim(p_password), gen_salt('bf', 10)),
    recovery_token = '',
    recovery_sent_at = null,
    updated_at = timezone('utc', now())
  where id = p_user_id;

  if not found then
    raise exception 'A conta de autenticacao do jogador nao foi localizada.';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_set_player_password(uuid, text) from public;
revoke all on function public.admin_set_player_password(uuid, text) from anon;
grant execute on function public.admin_set_player_password(uuid, text) to authenticated;
