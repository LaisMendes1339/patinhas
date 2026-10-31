import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAppointments } from '../src/lib/admin-summary.ts';

test('separa previsão, concluídos e cancelados usando o preço de cada reserva', () => {
 const item = (status, price, service = 'Banho', professional = 'Ana') => ({ status, price_cents: price, services: { name: service }, professionals: { name: professional } });
 const result = summarizeAppointments([item('confirmed', 7000), item('completed', 9000), item('cancelled', 20000), item('confirmed', 5000, 'Tosa', 'Bia')]);
 assert.equal(result.forecast, 12000);
 assert.equal(result.completedValue, 9000);
 assert.equal(result.cancelledValue, 20000);
 assert.equal(result.total, 21000);
 assert.equal(result.average, 7000);
 assert.equal(result.confirmed, 2);
 assert.deepEqual(result.byService, [{name: 'Banho', count: 2, total: 16000}, {name: 'Tosa', count: 1, total: 5000}]);
 assert.deepEqual(result.byProfessional, [{name: 'Ana', count: 2, total: 16000}, {name: 'Bia', count: 1, total: 5000}]);
});

test('agrupa a evolução pelo dia local e separa os valores concluídos e previstos', () => {
 const base = { services: { name: 'Banho' }, professionals: { name: 'Ana' } };
 const result = summarizeAppointments([
  { ...base, starts_at: '2026-11-01T01:00:00Z', status: 'completed', price_cents: 6000 },
  { ...base, starts_at: '2026-10-31T13:00:00Z', status: 'confirmed', price_cents: 8500 },
  { ...base, starts_at: '2026-10-31T14:00:00Z', status: 'cancelled', price_cents: 13000 },
  { ...base, starts_at: '2026-11-01T12:00:00Z', status: 'completed', price_cents: 9000 },
 ]);
 assert.deepEqual(result.daily, [
  { day: '2026-10-31', forecast: 8500, completed: 6000, count: 2 },
  { day: '2026-11-01', forecast: 0, completed: 9000, count: 1 },
 ]);
});

test('período vazio e somente cancelamentos não produzem receita nem média inválida', () => {
 for (const items of [[], [{status: 'cancelled', price_cents: 10000, services: null, professionals: null}]]) {
  const result = summarizeAppointments(items);
  assert.equal(result.forecast, 0);
  assert.equal(result.total, 0);
  assert.equal(result.average, 0);
  assert.deepEqual(result.byService, []);
 }
});
