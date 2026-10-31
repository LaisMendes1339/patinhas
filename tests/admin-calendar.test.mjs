import test from 'node:test';
import assert from 'node:assert/strict';
import { appointmentDay, calendarCells, calendarCounts, moveDay } from '../src/lib/admin-calendar.ts';

test('calendar starts on Monday and includes six complete weeks across year boundaries', () => {
 const cells = calendarCells('2027-01');
 assert.equal(cells.length, 42);
 assert.equal(cells[0], '2026-12-28');
 assert.equal(cells[41], '2027-02-07');
 assert.equal(new Set(cells).size, 42);
});

test('leap days and month navigation preserve actual calendar dates', () => {
 assert.ok(calendarCells('2024-02').includes('2024-02-29'));
 assert.equal(moveDay('2024-02-28', 1), '2024-02-29');
 assert.equal(moveDay('2026-12-31', 1), '2027-01-01');
});

test('reservations are counted on the local day and retain each status', () => {
 assert.equal(appointmentDay('2026-11-01T01:00:00Z'), '2026-10-31');
 const counts = calendarCounts([
  { starts_at: '2026-11-01T01:00:00Z', status: 'confirmed' },
  { starts_at: '2026-10-31T15:00:00Z', status: 'completed' },
  { starts_at: '2026-10-31T16:00:00Z', status: 'cancelled' },
  { starts_at: '2026-11-01T15:00:00Z', status: 'confirmed' },
 ]);
 assert.deepEqual(counts.get('2026-10-31'), { total: 3, confirmed: 1, completed: 1, cancelled: 1 });
 assert.deepEqual(counts.get('2026-11-01'), { total: 1, confirmed: 1, completed: 0, cancelled: 0 });
 assert.equal(calendarCounts([]).size, 0);
});
