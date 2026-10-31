import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBookingOperation, handleBookingRequest } from '../supabase/functions/booking-api/handler.mjs';

const params = {
 p_service: '10000000-0000-4000-8000-000000000001',
 p_professional: '20000000-0000-4000-8000-000000000001',
 p_start: '2030-01-07T12:00:00Z', p_name: 'Pessoa Teste', p_phone: '85999999999',
 p_email: 'Teste@example.com', p_pet: 'Pet Teste', p_species: 'dog', p_breed: '',
};

test('gateway rejeita RPCs administrativas e parâmetros para ignorar reservas', async () => {
 const rpc = () => { throw new Error('RPC não deveria ser chamada'); };
 for (const name of ['consume_limit', 'is_admin', 'toString', '__proto__']) {
  assert.equal((await runBookingOperation(name, {}, rpc)).error.code, 'INVALID_INPUT');
 }
 assert.equal((await runBookingOperation('available_slots', { p_service: params.p_service, p_date: '2030-01-07', p_ignore: params.p_service }, rpc)).error.code, 'INVALID_INPUT');
 assert.equal((await runBookingOperation('create_booking', { ...params, price_cents: 1 }, rpc)).error.code, 'INVALID_INPUT');
});

test('limite é consumido antes da confirmação sem armazenar e-mail em claro', async () => {
 const calls = [];
 const result = await runBookingOperation('create_booking', params, async (method, values) => {
  calls.push({ method, values });
  return { data: method === 'consume_limit' ? true : { reference: 42 }, error: null };
 });
 assert.equal(result.data.reference, 42);
 assert.equal(calls[0].method, 'consume_limit');
 assert.equal(calls[0].values.p_max, 5);
 assert.match(calls[0].values.p_key, /^booking:[a-f0-9]{64}$/);
 assert.equal(calls[1].method, 'create_booking');
 assert.equal(calls[1].values.p_email, 'teste@example.com');
});

test('limite excedido impede confirmação; falha de limite não é ignorada', async () => {
 for (const limit of [{ data: false, error: null }, { data: null, error: { message: 'offline' } }]) {
  let calls = 0;
  const result = await runBookingOperation('create_booking', params, async () => { calls++; return limit; });
  assert.equal(calls, 1);
  assert.equal(result.error.code, limit.error ? 'UNAVAILABLE' : 'RATE_LIMITED');
 }
});

test('mesmo contato com caixa diferente compartilha limite', async () => {
 const keys = [];
 for (const email of ['Teste@example.com', 'teste@example.com']) {
  await runBookingOperation('create_booking', { ...params, p_email: email }, async (_, values) => {
   keys.push(values.p_key);
   return { data: false, error: null };
  });
 }
 assert.equal(keys[0], keys[1]);
});

test('conflito de concorrência vira erro de horário sem vazar SQL', async () => {
 const result = await runBookingOperation('create_booking', params, async method => method === 'consume_limit'
  ? { data: true, error: null }
  : { data: null, error: { code: '23P01', message: 'SQL com dados internos' } });
 assert.equal(result.error.code, 'SLOT_UNAVAILABLE');
 assert.doesNotMatch(result.error.message, /SQL/);
});

test('reagendamento exige novo instante; cancelamento aplica limite por token', async () => {
 const base = { p_token: params.p_service, p_action: 'reschedule' };
 assert.equal((await runBookingOperation('manage_booking', base, () => { throw Error(); })).error.code, 'INVALID_INPUT');
 const calls = [];
 await runBookingOperation('manage_booking', { ...base, p_action: 'cancel' }, async (method, values) => {
  calls.push({ method, values }); return { data: true, error: null };
 });
 assert.equal(calls[0].values.p_max, 10);
 assert.equal(calls[1].values.p_start, null);
});

test('consulta pública não consome limite de confirmação', async () => {
 const methods = [];
 await runBookingOperation('available_dates', { p_service: params.p_service, p_month: '2030-01-01' }, async (name, values) => {
  methods.push(name); assert.equal(values.p_professional, null); return { data: [], error: null };
 });
 assert.deepEqual(methods, ['available_dates']);
});

test('HTTP rejeita métodos, JSON inválido e corpos grandes antes de consultar banco', async () => {
 const rpc = () => { throw Error('Não deveria consultar banco'); };
 const url = 'https://example.test/booking-api';
 assert.equal((await handleBookingRequest(new Request(url), rpc)).status, 405);
 assert.equal((await handleBookingRequest(new Request(url, { method: 'POST', body: '{' }), rpc)).status, 400);
 assert.equal((await handleBookingRequest(new Request(url, { method: 'POST', body: ' '.repeat(8193) }), rpc)).status, 413);
});
