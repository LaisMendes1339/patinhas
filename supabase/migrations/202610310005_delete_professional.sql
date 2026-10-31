-- Exclui cadastros sem histórico e seus vínculos operacionais atomicamente.
create function public.delete_professional(p_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from public.professionals where id=p_id for update;
 if not found then raise exception 'Professional not found' using errcode='P0002'; end if;
 if exists(select 1 from public.appointments where professional_id=p_id) then
  raise exception 'Professional has appointment history' using errcode='23503';
 end if;
 delete from public.availability_exceptions where professional_id=p_id;
 delete from public.working_hours where professional_id=p_id;
 delete from public.professionals where id=p_id;
end;
$$;
revoke all on function public.delete_professional(uuid) from public,anon;
grant execute on function public.delete_professional(uuid) to authenticated;
