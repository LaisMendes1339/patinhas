import { handleAccounts } from './handler.mjs';

Deno.serve((request: Request) => handleAccounts(request, async (path: string, init: RequestInit = {}, authorization?: string) => {
 const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const response = await fetch(`${Deno.env.get('SUPABASE_URL')}${path}`, {
  ...init,
  headers: { apikey: key, Authorization: authorization ?? `Bearer ${key}`, 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(15000),
 });
 if (!response.ok) throw new Error('UPSTREAM');
 const body = await response.text();
 return body ? JSON.parse(body) : null;
}));
