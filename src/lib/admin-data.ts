import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/components/admin-agenda';
import type { RevenueAppointment } from './admin-summary';
import type { adminPeriod } from './admin-period';

export type AdminSection = 'overview' | 'agenda' | 'registrations' | 'settings';
type Result<T> = { data: T[] | null; error: unknown };
type Service = { id: string; name: string; description: string; duration_minutes: number; price_cents: number; active: boolean };
type Professional = { id: string; name: string; active: boolean };
type Customer = { id: string; name: string; email: string; phone: string };
type Pet = { id: string; name: string; customer_id: string; species: string; breed: string };
type Hours = { id: string; professional_id: string; weekday: number; opens: string; closes: string };
type Block = { id: string; professional_id: string | null; starts_at: string; ends_at: string; reason: string };
type Settings = { id: boolean; cancellation_hours: number; reschedule_hours: number; horizon_days: number };
type ServiceLink = { professional_id: string; service_id: string };
const empty = <T>(): Result<T> => ({ data: [], error: null });

// Query planning is explicit: inactive sections do not contact the database.
export function adminDataPlan(section: AdminSection, role: 'owner' | 'staff') {
 return {
  appointments: section === 'agenda', revenue: section === 'overview',
  services: section !== 'settings', professionals: true,
  customers: section === 'registrations', pets: section === 'registrations', links: section === 'registrations',
  hours: section === 'settings', blocks: section === 'settings', settings: section === 'settings' && role === 'owner',
 };
}

export async function loadAdminData(db: SupabaseClient, section: AdminSection, period: ReturnType<typeof adminPeriod>, filters: { professional?: string; service?: string }, role: 'owner' | 'staff') {
 const started = performance.now();
 const plan = adminDataPlan(section, role);
 let queries = 0;
 async function run<T>(enabled: boolean, query: () => PromiseLike<Result<T>>) {
  if (!enabled) return empty<T>();
  queries++;
  return await query();
 }
 async function pages<T>(enabled: boolean, query: (from: number, to: number) => PromiseLike<Result<T>>) {
  if (!enabled) return empty<T>();
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
   queries++;
   const result = await query(offset, offset + 499);
   if (result.error) return { data: null, error: result.error };
   rows.push(...(result.data ?? []));
   if ((result.data?.length ?? 0) < 500) return { data: rows, error: null };
  }
 }
 function bookings(columns: string) {
  let query = db.from('appointments').select(columns).gte('starts_at', period.begin).lt('starts_at', period.end).order('starts_at').order('id');
  if (filters.professional) query = query.eq('professional_id', filters.professional);
  if (filters.service) query = query.eq('service_id', filters.service);
  return query;
 }
 const [appointments, revenue, services, professionals, customers, pets, hours, blocks, settings, links] = await Promise.all([
  pages<Appointment>(plan.appointments, (from, to) => bookings('id,reference,starts_at,ends_at,price_cents,status,customers(name,phone,email),pets(name),services(name),professionals(name)').range(from, to).returns<Appointment[]>()),
  // The dashboard never needs the customers/pets joins or their personal data.
  pages<RevenueAppointment>(plan.revenue, (from, to) => bookings('starts_at,price_cents,status,services(name),professionals(name)').range(from, to).returns<RevenueAppointment[]>()),
  run<Service>(plan.services, () => db.from('services').select('id,name,description,duration_minutes,price_cents,active').order('name').returns<Service[]>()),
  run<Professional>(plan.professionals, () => db.from('professionals').select('id,name,active').order('name').returns<Professional[]>()),
  pages<Customer>(plan.customers, (from, to) => db.from('customers').select('id,name,email,phone').order('name').order('id').range(from, to).returns<Customer[]>()),
  pages<Pet>(plan.pets, (from, to) => db.from('pets').select('id,name,customer_id,species,breed').order('name').order('id').range(from, to).returns<Pet[]>()),
  run<Hours>(plan.hours, () => db.from('working_hours').select('id,professional_id,weekday,opens,closes').order('weekday').returns<Hours[]>()),
  run<Block>(plan.blocks, () => db.from('availability_exceptions').select('id,professional_id,starts_at,ends_at,reason').gte('ends_at', new Date().toISOString()).order('starts_at').returns<Block[]>()),
  run<Settings>(plan.settings, () => db.from('booking_settings').select('id,cancellation_hours,reschedule_hours,horizon_days').returns<Settings[]>()),
  run<ServiceLink>(plan.links, () => db.from('professional_services').select('professional_id,service_id').returns<ServiceLink[]>()),
 ]);
 const failed = [appointments, revenue, services, professionals, customers, pets, hours, blocks, settings, links].some(result => result.error);
 const timing = { section, queries, ms: Math.round(performance.now() - started), failed };
 if (process.env.ADMIN_PERF_LOGS === 'true') console.info('[admin:data]', JSON.stringify(timing));
 return { appointments, revenue, services, professionals, customers, pets, hours, blocks, settings: settings.data?.[0], links, failed, timing };
}
