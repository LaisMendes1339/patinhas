import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('PostgreSQL: disponibilidade, concorrência, cancelamento e RLS', {skip:!process.env.TEST_DATABASE_URL}, async t=>{
 const {Pool}=await import('pg');
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,max:12});
 const run=randomUUID(),service=randomUUID(),p1=randomUUID(),p2=randomUUID();
 const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
 const nextDay=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
 const start=(h,d=day)=>`${d}T${h}:00:00-03:00`;
 const book=async (professional,h,d=day)=>{const {rows}=await pool.query('select public.create_booking($1,$2,$3,$4,$5,$6,$7,$8,$9) as booking',[service,professional,start(h,d),'Cliente de teste','85999990000',`${run}@example.test`,'Pet teste','dog','SRD']);return rows[0].booking;};
 const slots=async(d=day,professional=p1)=>(await pool.query('select * from public.available_slots($1,$2,$3)',[service,d,professional])).rows;
 try {
  await pool.query('insert into public.services(id,name,description,duration_minutes,price_cents) values($1,$2,$3,120,13000)',[service,`Teste ${run}`,'Fixture isolada']);
  await pool.query('insert into public.professionals(id,name) values($1,$3),($2,$4)',[p1,p2,`Teste A ${run}`,`Teste B ${run}`]);
  await pool.query('insert into public.professional_services values($1,$3),($2,$3)',[p1,p2,service]);
  await pool.query("insert into public.working_hours(professional_id,weekday,opens,closes) select p,d,o::time,c::time from unnest($1::uuid[]) p cross join generate_series(0,6) d cross join (values('08:00','12:00'),('13:00','18:00')) h(o,c)",[[p1,p2]]);
  let winner;
  await t.test('oito reservas simultâneas produzem exatamente uma confirmação',async()=>{
   const results=await Promise.allSettled(Array.from({length:8},()=>book(p1,'09')));
   const success=results.filter(r=>r.status==='fulfilled');
   assert.equal(success.length,1);winner=success[0].value;
   for(const r of results.filter(r=>r.status==='rejected'))assert.ok(r.reason.code==='23P01'||r.reason.message.includes('SLOT_UNAVAILABLE'));
   assert.equal((await pool.query('select count(*)::int n from public.appointments where professional_id=$1',[p1])).rows[0].n,1);
   assert.equal((await pool.query('select count(*)::int n from public.customers where email=$1',[`${run}@example.test`])).rows[0].n,1,'conflitos não deixam clientes órfãos');
  });
  await t.test('bloqueia todo intervalo e permite outro profissional',async()=>{
   await assert.rejects(()=>book(p1,'10'));
   await book(p2,'09');
   const free=await slots();
   assert.ok(!free.some(s=>new Date(s.starts_at).getTime()===new Date(start('10')).getTime()));
   assert.ok(free.some(s=>new Date(s.starts_at).getTime()===new Date(start('13')).getTime()));
  });
  await t.test('pausas, fechamento e passado são revalidados no banco',async()=>{
   await assert.rejects(()=>book(p1,'11'));
   await assert.rejects(()=>book(p1,'12'));
   await assert.rejects(()=>book(p1,'17'));
   await assert.rejects(()=>book(p1,'09','2000-01-01'));
  });
  await t.test('cancelamento libera imediatamente o intervalo',async()=>{
   await pool.query("select public.manage_booking($1,'cancel')",[winner.management_token]);
   const replacement=await book(p1,'09');
   assert.ok(replacement.reference>winner.reference);
   winner=replacement;
  });
  await t.test('reagendamento libera o anterior e bloqueia o novo',async()=>{
   await pool.query("select public.manage_booking($1,'reschedule',$2)",[winner.management_token,start('13')]);
   await book(p1,'09');
   await assert.rejects(()=>book(p1,'14'));
   await book(p1,'15'); // termina às 15:00 e o próximo começa às 15:00
  });
  await t.test('folga de profissional bloqueia apenas aquele profissional',async()=>{
   await pool.query('insert into public.availability_exceptions(professional_id,starts_at,ends_at,reason) values($1,$2,$3,$4)',[p1,start('00',nextDay),start('23',nextDay),run]);
   assert.equal((await slots(nextDay,p1)).length,0);
   assert.ok((await slots(nextDay,p2)).length>0);
  });
  await t.test('feriado da loja bloqueia todos os profissionais',async()=>{
   await pool.query('insert into public.availability_exceptions(starts_at,ends_at,reason) values($1,$2,$3)',[start('00',nextDay),start('23',nextDay),run]);
   assert.equal((await slots(nextDay,p2)).length,0);
  });
  await t.test('anon não lê dados pessoais nem executa reservas diretamente',async()=>{
   const client=await pool.connect();try{await client.query('begin');await client.query('set local role anon');await assert.rejects(()=>client.query('select * from public.customers'),e=>e.code==='42501');await client.query('rollback');await client.query('begin');await client.query('set local role anon');await assert.rejects(()=>client.query('select * from public.available_slots($1,$2,$3)',[service,day,p1]),e=>e.code==='42501');}finally{await client.query('rollback');client.release();}
  });
 } finally {
  // Remove somente fixtures deste teste, em banco explicitamente designado para testes.
  await pool.query('delete from public.appointments where professional_id=any($1::uuid[])',[[p1,p2]]);
  await pool.query('delete from public.pets where customer_id in (select id from public.customers where email=$1)',[`${run}@example.test`]);
  await pool.query('delete from public.customers where email=$1',[`${run}@example.test`]);
  await pool.query('delete from public.availability_exceptions where reason=$1',[run]);
  await pool.query('delete from public.working_hours where professional_id=any($1::uuid[])',[[p1,p2]]);
  await pool.query('delete from public.professionals where id=any($1::uuid[])',[[p1,p2]]);
  await pool.query('delete from public.services where id=$1',[service]);
  await pool.end();
 }
});
