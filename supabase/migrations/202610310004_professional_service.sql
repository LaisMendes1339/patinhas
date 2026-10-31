-- Cria o profissional e o primeiro vínculo na mesma transação.
create function public.create_professional_with_service(p_name text, p_service uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare professional uuid;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 200 then
  raise exception 'Invalid name' using errcode = '22023';
 end if;
 if not exists(select 1 from public.services where id=p_service and active) then
  raise exception 'Invalid service' using errcode = '22023';
 end if;
 insert into public.professionals(name,active) values(btrim(p_name),true) returning id into professional;
 insert into public.professional_services(professional_id,service_id) values(professional,p_service);
 return professional;
end;
$$;
revoke all on function public.create_professional_with_service(text,uuid) from public, anon;
grant execute on function public.create_professional_with_service(text,uuid) to authenticated;
