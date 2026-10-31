-- A verificação de papel é usada pelas políticas de usuários autenticados.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
