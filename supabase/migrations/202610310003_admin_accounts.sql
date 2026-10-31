alter table public.admin_users add column active boolean not null default true;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.admin_users where user_id = auth.uid() and active);
$$;

drop policy settings_owner on public.booking_settings;
create policy settings_owner on public.booking_settings for update to authenticated
using (exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner' and active))
with check (exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner' and active));
