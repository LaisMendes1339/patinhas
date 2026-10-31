import { z } from 'zod';

const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const schemas = {
  available_slots: z.object({ p_service: uuid, p_date: z.iso.date(), p_professional: uuid.nullable().default(null) }).strict(),
  available_dates: z.object({ p_service: uuid, p_month: z.iso.date(), p_professional: uuid.nullable().default(null) }).strict(),
  create_booking: z.object({
    p_service: uuid, p_professional: uuid, p_start: timestamp,
    p_name: z.string().trim().min(3).max(100),
    p_phone: z.string().regex(/^\+?[\d ()-]{10,20}$/),
    p_email: z.email().max(254).transform(v => v.toLowerCase()),
    p_pet: z.string().trim().min(1).max(80), p_species: z.enum(['dog', 'cat']), p_breed: z.string().trim().max(80),
  }).strict(),
  manage_booking: z.object({ p_token: uuid, p_action: z.enum(['cancel', 'reschedule']), p_start: timestamp.nullable().default(null) })
    .strict().refine(v => v.p_action !== 'reschedule' || v.p_start !== null),
};

// Both the Next server and Edge Function use this boundary. No arbitrary RPCs,
// prices, durations, ignored appointments or rate-limit parameters are accepted.
export async function runBookingOperation(method, params, rpc) {
  if (!Object.hasOwn(schemas, method)) return { data: null, error: { code: 'INVALID_INPUT', message: 'Operação inválida.' } };
  const parsed = schemas[method].safeParse(params);
  if (!parsed.success) return { data: null, error: { code: 'INVALID_INPUT', message: 'Dados inválidos.' } };
  const values = parsed.data;
  let key;
  if (method === 'create_booking') {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(values.p_email));
    key = `booking:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
  } else if (method === 'manage_booking') key = `manage:${values.p_token}`;
  if (key) {
    const limit = await rpc('consume_limit', { p_key: key, p_max: method === 'create_booking' ? 5 : 10 });
    if (limit.error) return { data: null, error: { code: 'UNAVAILABLE', message: 'Serviço temporariamente indisponível.' } };
    if (!limit.data) return { data: null, error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde dez minutos.' } };
  }
  const result = await rpc(method, values);
  if (!result.error) return { data: result.data, error: null };
  const message = result.error.message ?? '';
  if (result.error.code === '23P01' || message.includes('SLOT_UNAVAILABLE')) return { data: null, error: { code: 'SLOT_UNAVAILABLE', message: 'Esse horário acabou de ficar indisponível. Escolha outro horário.' } };
  if (message.includes('DEADLINE_EXCEEDED')) return { data: null, error: { code: 'DEADLINE_EXCEEDED', message: 'O prazo para alteração online terminou. Entre em contato com a equipe.' } };
  if (message.includes('BOOKING_UNAVAILABLE')) return { data: null, error: { code: 'BOOKING_UNAVAILABLE', message: 'Reserva indisponível. Confira seu código.' } };
  return { data: null, error: { code: 'UNAVAILABLE', message: 'Serviço temporariamente indisponível.' } };
}

export async function handleBookingRequest(request, rpc) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.method !== 'POST') return Response.json({ error: 'Método inválido.' }, { status: 405, headers: { ...headers, Allow: 'POST' } });
  if (Number(request.headers.get('content-length') ?? 0) > 8192) return Response.json({ error: 'Requisição muito grande.' }, { status: 413, headers });
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 8192) return Response.json({ error: 'Requisição muito grande.' }, { status: 413, headers });
    const body = JSON.parse(text);
    const result = await runBookingOperation(body.method, body.params, rpc);
    return Response.json(result, { headers });
  } catch {
    return Response.json({ data: null, error: { code: 'UNAVAILABLE', message: 'Não foi possível processar a solicitação.' } }, { status: 400, headers });
  }
}
