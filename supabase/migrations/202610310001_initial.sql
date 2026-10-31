-- Pendente de inspeção do projeto remoto e aprovação. Não executar automaticamente.
begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('owner','staff')));
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from admin_users where user_id = auth.uid()); $$;
create table public.services (id uuid primary key default gen_random_uuid(), name text not null, description text not null default '', duration_minutes integer not null check(duration_minutes between 15 and 480 and duration_minutes % 15 = 0), price_cents integer not null check(price_cents >= 0), active boolean not null default true);
create table public.professionals (id uuid primary key default gen_random_uuid(), name text not null, active boolean not null default true);
create table public.professional_services (professional_id uuid references public.professionals on delete cascade, service_id uuid references public.services on delete cascade, primary key(professional_id,service_id));
create table public.customers (id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null, created_at timestamptz not null default now());
create table public.pets (id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers, name text not null, species text not null check(species in ('dog','cat')), breed text not null default '');
-- Cada linha representa um intervalo de trabalho. Pausas são lacunas entre intervalos.
create table public.working_hours (id uuid primary key default gen_random_uuid(), professional_id uuid not null references public.professionals, weekday integer not null check(weekday between 0 and 6), opens time not null, closes time not null, check(opens < closes), exclude using gist(professional_id with =, weekday with =, (int4range(extract(epoch from opens)::int,extract(epoch from closes)::int,'[)')) with &&));
create table public.availability_exceptions (id uuid primary key default gen_random_uuid(), professional_id uuid references public.professionals, starts_at timestamptz not null, ends_at timestamptz not null, reason text not null, check(starts_at < ends_at));
create index exceptions_period_idx on public.availability_exceptions using gist(tstzrange(starts_at,ends_at,'[)'));
create table public.booking_settings (id boolean primary key default true check(id), cancellation_hours integer not null default 12 check(cancellation_hours >= 0), reschedule_hours integer not null default 12 check(reschedule_hours >= 0), horizon_days integer not null default 90 check(horizon_days between 1 and 365));
insert into public.booking_settings(id) values(true);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), reference bigint generated always as identity unique,
  customer_id uuid not null references public.customers, pet_id uuid not null references public.pets,
  service_id uuid not null references public.services, professional_id uuid not null references public.professionals,
  starts_at timestamptz not null, ends_at timestamptz not null, price_cents integer not null check(price_cents >= 0),
  status text not null default 'confirmed' check(status in ('confirmed','cancelled','completed')),
  management_token uuid not null default gen_random_uuid() unique, created_at timestamptz not null default now(),
  check(starts_at < ends_at),
  constraint appointments_no_overlap exclude using gist (professional_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status <> 'cancelled')
);
create index appointments_date_idx on public.appointments(starts_at);
create index appointments_customer_idx on public.appointments(customer_id);
create index pets_customer_idx on public.pets(customer_id);
create table public.request_limits (key text primary key, window_start timestamptz not null default now(), count integer not null default 1);
create function public.consume_limit(p_key text, p_max integer default 15) returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
 insert into request_limits(key) values(p_key) on conflict(key) do update set count=case when request_limits.window_start < now()-interval '10 minutes' then 1 else request_limits.count+1 end, window_start=case when request_limits.window_start < now()-interval '10 minutes' then now() else request_limits.window_start end returning count into n;
 return n <= p_max;
end $$;
create function public.available_slots(p_service uuid,p_date date,p_professional uuid default null,p_ignore uuid default null)
returns table(professional_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
 with candidates as (
 select p.id professional_id, g.t starts_at, g.t + make_interval(mins=>s.duration_minutes) ends_at
 from services s join professional_services ps on ps.service_id=s.id join professionals p on p.id=ps.professional_id
 join working_hours w on w.professional_id=p.id and w.weekday=extract(dow from p_date)
 cross join lateral generate_series((p_date+w.opens) at time zone 'America/Fortaleza', ((p_date+w.closes) at time zone 'America/Fortaleza') - make_interval(mins=>s.duration_minutes), interval '15 minutes') g(t)
 where s.id=p_service and s.active and p.active and (p_professional is null or p.id=p_professional)
 and p_date between (now() at time zone 'America/Fortaleza')::date and (now() at time zone 'America/Fortaleza')::date+(select horizon_days from booking_settings where id)
 ) select c.* from candidates c where c.starts_at > now()
 and not exists(select 1 from availability_exceptions e where (e.professional_id is null or e.professional_id=c.professional_id) and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
 and not exists(select 1 from appointments a where a.professional_id=c.professional_id and a.status <> 'cancelled' and (p_ignore is null or a.id <> p_ignore) and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(c.starts_at,c.ends_at,'[)'))
 order by c.starts_at,c.professional_id;
$$;
create function public.available_dates(p_service uuid,p_month date,p_professional uuid default null) returns table(day date) language sql stable security definer set search_path=public as $$
 select g.d::date from generate_series(date_trunc('month',p_month::timestamp),date_trunc('month',p_month::timestamp)+interval '1 month - 1 day',interval '1 day') g(d)
 where exists(select 1 from available_slots(p_service,g.d::date,p_professional));
$$;
revoke execute on function public.available_dates(uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.available_dates(uuid,date,uuid) to service_role;
create function public.lock_booking_configuration() returns trigger language plpgsql set search_path = public as $$ begin perform pg_advisory_xact_lock(726310); return null; end $$;
create trigger hours_lock before insert or update or delete on public.working_hours for each statement execute function public.lock_booking_configuration();
create trigger exceptions_lock before insert or update or delete on public.availability_exceptions for each statement execute function public.lock_booking_configuration();
create trigger services_lock before insert or update or delete on public.services for each statement execute function public.lock_booking_configuration();
create trigger professionals_lock before insert or update or delete on public.professionals for each statement execute function public.lock_booking_configuration();
create trigger links_lock before insert or update or delete on public.professional_services for each statement execute function public.lock_booking_configuration();
create trigger settings_lock before insert or update or delete on public.booking_settings for each statement execute function public.lock_booking_configuration();
create function public.validate_appointment() returns trigger language plpgsql security definer set search_path = public as $$
declare slot record;
begin
 perform pg_advisory_xact_lock_shared(726310);
 if not exists(select 1 from pets where id=new.pet_id and customer_id=new.customer_id) then raise exception 'INVALID_PET'; end if;
 if new.status='cancelled' then return new; end if;
 if TG_OP='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.service_id=old.service_id and new.professional_id=old.professional_id and old.status<>'cancelled' then return new; end if;
 select * into slot from available_slots(new.service_id,(new.starts_at at time zone 'America/Fortaleza')::date,new.professional_id,new.id) s where s.starts_at=new.starts_at;
 if not found then raise exception 'SLOT_UNAVAILABLE' using errcode='P0001'; end if;
 new.ends_at=slot.ends_at;
 select price_cents into new.price_cents from services where id=new.service_id;
 return new;
end $$;
create trigger appointment_validation before insert or update on public.appointments for each row execute function public.validate_appointment();
create function public.create_booking(p_service uuid,p_professional uuid,p_start timestamptz,p_name text,p_phone text,p_email text,p_pet text,p_species text,p_breed text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cid uuid; pid uuid; a appointments;
begin
 if length(trim(p_name)) not between 3 and 100 or length(p_phone) not between 10 and 20 or length(p_email)>254 or position('@' in p_email)<2 or length(trim(p_pet)) not between 1 and 80 or length(p_breed)>80 then raise exception 'INVALID_INPUT'; end if;
 insert into customers(name,phone,email) values(trim(p_name),p_phone,lower(p_email)) returning id into cid;
 insert into pets(customer_id,name,species,breed) values(cid,trim(p_pet),p_species,p_breed) returning id into pid;
 insert into appointments(customer_id,pet_id,service_id,professional_id,starts_at,ends_at,price_cents) values(cid,pid,p_service,p_professional,p_start,p_start+interval '1 minute',0) returning * into a;
 return jsonb_build_object('id',a.id,'reference',a.reference,'starts_at',a.starts_at,'ends_at',a.ends_at,'price_cents',a.price_cents,'management_token',a.management_token);
end $$;
create function public.manage_booking(p_token uuid,p_action text,p_start timestamptz default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a appointments; hours integer;
begin
 select * into a from appointments where management_token=p_token for update;
 if not found or a.status<>'confirmed' then raise exception 'BOOKING_UNAVAILABLE'; end if;
 select case when p_action='cancel' then cancellation_hours else reschedule_hours end into hours from booking_settings where id;
 if a.starts_at < now()+make_interval(hours=>hours) then raise exception 'DEADLINE_EXCEEDED'; end if;
 if p_action='cancel' then update appointments set status='cancelled' where id=a.id;
 elsif p_action='reschedule' and p_start is not null then update appointments set starts_at=p_start where id=a.id returning * into a;
 else raise exception 'INVALID_ACTION'; end if;
 return jsonb_build_object('reference',a.reference,'starts_at',a.starts_at);
end $$;
-- RLS: visitantes só consultam catálogo. Dados pessoais exigem papel administrativo.
do $$ declare t text; begin
 foreach t in array array['admin_users','services','professionals','professional_services','customers','pets','working_hours','availability_exceptions','appointments','booking_settings','request_limits'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 if t not in ('admin_users','request_limits') then
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy admin_access on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);
 end if;
 end loop;
end $$;
grant select on public.admin_users to authenticated;
drop policy admin_access on public.booking_settings;
create policy settings_read on public.booking_settings for select to authenticated using(public.is_admin());
create policy settings_owner on public.booking_settings for update to authenticated using(exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner')) with check(exists(select 1 from public.admin_users where user_id=auth.uid() and role='owner'));
create policy own_role on public.admin_users for select to authenticated using(user_id=auth.uid());
grant select on public.services,public.professionals,public.professional_services to anon;
create policy public_services on public.services for select to anon using(active);
create policy public_professionals on public.professionals for select to anon using(active);
create policy public_links on public.professional_services for select to anon using(true);
grant usage,select on sequence public.appointments_reference_seq to authenticated, service_role;
revoke execute on function public.available_slots(uuid,date,uuid,uuid), public.create_booking(uuid,uuid,timestamptz,text,text,text,text,text,text), public.manage_booking(uuid,text,timestamptz), public.consume_limit(text,integer) from public,anon,authenticated;
grant execute on function public.available_slots(uuid,date,uuid,uuid), public.create_booking(uuid,uuid,timestamptz,text,text,text,text,text,text), public.manage_booking(uuid,text,timestamptz), public.consume_limit(text,integer) to service_role;
revoke execute on function public.validate_appointment(),public.lock_booking_configuration() from public,anon,authenticated;
commit;
