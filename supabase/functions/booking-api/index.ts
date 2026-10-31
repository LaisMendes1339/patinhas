import { handleBookingRequest } from './handler.mjs';

// The platform checks the caller's JWT; only these validated public booking
// operations reach the privileged client. Its key never leaves this runtime.
Deno.serve((request: Request) => handleBookingRequest(request, async (method: string, params: object) => {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${method}`, {
    method: 'POST',
    headers: {
      apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json();
  return response.ok ? { data: body, error: null } : { data: null, error: body };
}));
