grant execute on function public.submit_championship_registration(
  text,
  text,
  text,
  text,
  text,
  timestamptz
) to anon, authenticated;

notify pgrst, 'reload schema';
