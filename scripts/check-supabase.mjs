import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
if (existsSync('.env.local')) {
 const file = parseEnv(readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, ''));
 for (const [key, value] of Object.entries(file)) if (!process.env[key]) process.env[key] = value;
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configure a URL e a chave pública em .env.local.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: {
 fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }),
} });
async function timed(label, run) {
 const started = performance.now();
 const result = await run();
 if (result.error) throw new Error(`${label}: ${result.error.code ?? ''} ${result.error.message}`);
 console.log(`OK ${label}: ${Math.round(performance.now() - started)} ms`);
 return result.data;
}
try {
 const services = await timed('Catálogo público', () => db.from('services').select('id,name').eq('active', true));
 if (!services.length) throw new Error('O catálogo não contém serviços ativos.');
 const professionals = await timed('Profissionais e serviços', () => db.from('professionals').select('id,professional_services(service_id)').eq('active', true));
 if (!professionals.some(p => p.professional_services.length)) throw new Error('Não há profissionais vinculados aos serviços.');
 const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
 const months = [today.slice(0, 7) + '-01', new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1)).toISOString().slice(0, 10)];
 let date;
 async function invoke(method, params) {
  const result = await db.functions.invoke('booking-api', { body: { method, params } });
  return result.error ? result : result.data;
 }
 for (const month of months) {
  const dates = await timed(`Datas ${month.slice(0, 7)}`, () => invoke('available_dates', { p_service: services[0].id, p_month: month }));
  if (dates.length) { date = dates[0].day; break; }
 }
 if (date) {
  const slots = await timed(`Horários ${date}`, () => invoke('available_slots', { p_service: services[0].id, p_date: date }));
  if (!slots.length) throw new Error('O calendário indicou uma data sem horários.');
  console.log(`OK ${slots.length} horários disponíveis`);
 } else console.log('AVISO Nenhuma vaga nos dois primeiros meses; confira expediente e bloqueios.');
 const rejected = await invoke('create_booking', { p_service: services[0].id });
 if (rejected.error?.code !== 'INVALID_INPUT') throw new Error('O gateway não rejeitou os dados incompletos.');
 console.log('OK Validação de reserva incompleta; nenhuma reserva de teste foi criada.');
} catch (error) {
 console.error(error.message);
 console.error('Se aparecer EACCES ou fetch failed, execute este comando no seu próprio terminal com acesso à internet.');
 process.exitCode = 1;
}
