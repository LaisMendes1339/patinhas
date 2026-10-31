import test from 'node:test';
import assert from 'node:assert/strict';
import { adminPeriod } from '../src/lib/admin-period.ts';

test('defaults to the whole current month with exclusive upper boundary in local time', () => {
 const result = adminPeriod({}, '2026-10-31');
 assert.equal(result.from, '2026-10-01');
 assert.equal(result.to, '2026-10-31');
 assert.equal(result.begin, '2026-10-01T03:00:00.000Z');
 assert.equal(result.end, '2026-11-01T03:00:00.000Z');
});
test('handles leap years, month lengths and week crossing a year', () => {
 assert.equal(adminPeriod({ month: '2024-02' }, '2026-10-31').to, '2024-02-29');
 assert.equal(adminPeriod({ month: '2025-02' }, '2026-10-31').to, '2025-02-28');
 assert.equal(adminPeriod({ view: 'week', date: '2026-12-29' }, '2026-10-31').to, '2027-01-04');
});
test('rejects invalid dates and bounds reversed or excessive custom intervals', () => {
 assert.equal(adminPeriod({ view: 'day', date: '2026-02-31' }, '2026-10-31').from, '2026-10-31');
 const reversed = adminPeriod({ view: 'custom', from: '2026-10-10', to: '2026-10-01' }, '2026-10-31');
 assert.equal(reversed.from, reversed.to);
 const long = adminPeriod({ view: 'custom', from: '2026-01-01', to: '2030-01-01' }, '2026-10-31');
 assert.equal(long.to, '2027-01-01');
});
