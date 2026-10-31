import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
export const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const timedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
export function publicClient() {
  if (!configured()) throw new Error('Integração Supabase não configurada.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: timedFetch } });
}
export function database() {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Integração Supabase não configurada.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: timedFetch } });
}
export const authClient = cache(async function authClient() {
  const jar = await cookies();
  if (!configured()) throw new Error('Integração Supabase não configurada.');
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { fetch: timedFetch }, cookies: { getAll: () => jar.getAll(), setAll: values => { try { for (const {name, value, options} of values) jar.set(name, value, options); } catch { /* Server Components: a renovação é feita em proxy.ts. */ } } } });
});
