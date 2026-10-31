-- Dados fictícios. Executar somente após aprovação e inspeção do projeto.
begin;
insert into public.services(id,name,description,duration_minutes,price_cents) values
('10000000-0000-4000-8000-000000000001','Banho','Um momento de cuidado, com produtos adequados à pele e pelagem.',60,6000),
('10000000-0000-4000-8000-000000000002','Tosa','Conforto e estilo, respeitando as características do seu pet.',90,8500),
('10000000-0000-4000-8000-000000000003','Banho e tosa','O cuidado completo para voltar para casa de banho tomado e visual novo.',120,13000),
('10000000-0000-4000-8000-000000000004','Consulta veterinária','Atenção individual para acompanhar a saúde de quem você ama.',30,12000);
insert into public.professionals(id,name) values ('20000000-0000-4000-8000-000000000001','Marina • cuidados e estética'),('20000000-0000-4000-8000-000000000002','Rafael • cuidados e estética'),('20000000-0000-4000-8000-000000000003','Dra. Clara • veterinária');
insert into public.professional_services select p.id,s.id from public.professionals p cross join public.services s where (p.name like 'Dra.%' and s.name='Consulta veterinária') or (p.name not like 'Dra.%' and s.name<>'Consulta veterinária');
insert into public.working_hours(professional_id,weekday,opens,closes) select p.id,d, o::time,c::time from public.professionals p cross join generate_series(1,6) d cross join (values('08:00','12:00'),('13:00','18:00')) h(o,c);
commit;
