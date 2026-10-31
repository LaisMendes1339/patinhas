import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminData } from '../src/lib/admin-data.ts';
import { adminPeriod } from '../src/lib/admin-period.ts';

const period = adminPeriod({}, '2026-10-31');
function fakeDb(fixtures = {}, failed = '') {
 const calls = [];
 return { calls, from(table) {
  const call = { table, columns: '', filters: [] }; calls.push(call);
  let range;
  const builder = {
   select(columns) { call.columns = columns; return builder; },
   order() { return builder; },
   gte(...args) { call.filters.push(['gte', ...args]); return builder; },
   lt(...args) { call.filters.push(['lt', ...args]); return builder; },
   eq(...args) { call.filters.push(['eq', ...args]); return builder; },
   range(from, to) { range = [from, to]; return builder; },
   async returns() {
    const rows = fixtures[table] ?? [];
    return { data: table === failed ? null : range ? rows.slice(range[0], range[1] + 1) : rows, error: table === failed ? { code: 'TEST_FAILURE' } : null };
   },
  };
  return builder;
 } };
}

test('each screen fetches only its required tables', async () => {
 const expectations = {
  overview: ['appointments', 'professionals', 'services'],
  agenda: ['appointments', 'professionals', 'services'],
  registrations: ['customers', 'pets', 'professional_services', 'professionals', 'services'],
  settings: ['availability_exceptions', 'booking_settings', 'professionals', 'working_hours'],
 };
 for (const [section, tables] of Object.entries(expectations)) {
  const db = fakeDb();
  const result = await loadAdminData(db, section, period, {}, 'owner');
  assert.deepEqual(db.calls.map(call => call.table).sort(), tables);
  assert.equal(result.timing.queries, tables.length);
  assert.equal(result.failed, false);
 }
 const staff = fakeDb();
 await loadAdminData(staff, 'settings', period, {}, 'staff');
 assert.equal(staff.calls.some(call => call.table === 'booking_settings'), false);
});

test('overview avoids personal-data joins while retaining date, service and professional filters', async () => {
 const db = fakeDb();
 await loadAdminData(db, 'overview', period, { professional: 'professional-id', service: 'service-id' }, 'owner');
 const call = db.calls.find(call => call.table === 'appointments');
 assert.equal(call.columns.includes('customers('), false);
 assert.equal(call.columns.includes('pets('), false);
 assert.deepEqual(call.filters, [['gte', 'starts_at', period.begin], ['lt', 'starts_at', period.end], ['eq', 'professional_id', 'professional-id'], ['eq', 'service_id', 'service-id']]);
});

test('registry pagination retains records beyond the first database batch', async () => {
 const customers = Array.from({ length: 501 }, (_, i) => ({ id: String(i), name: `Customer ${i}` }));
 const db = fakeDb({ customers });
 const result = await loadAdminData(db, 'registrations', period, {}, 'owner');
 assert.equal(result.customers.data.length, 501);
 assert.equal(db.calls.filter(call => call.table === 'customers').length, 2);
 assert.equal(db.calls.some(call => call.table === 'appointments'), false);
});

test('a failed query marks data incomplete instead of presenting it as a complete result', async () => {
 const db = fakeDb({}, 'appointments');
 const result = await loadAdminData(db, 'agenda', period, {}, 'owner');
 assert.equal(result.failed, true);
 assert.equal(result.appointments.data, null);
});
