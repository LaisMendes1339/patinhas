const localDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' });
export const appointmentDay = (value: string) => localDayFormatter.format(new Date(value));
export function moveDay(day: string, amount: number) {
 return new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
}
export function calendarCells(month: string) {
 const first = `${month}-01`;
 const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
 return Array.from({ length: 42 }, (_, index) => moveDay(first, index - offset));
}
export function calendarCounts(rows: { starts_at: string; status: string }[]) {
 const counts = new Map<string, { total: number; confirmed: number; completed: number; cancelled: number }>();
 for (const row of rows) {
  const day = appointmentDay(row.starts_at);
  const entry = counts.get(day) ?? { total: 0, confirmed: 0, completed: 0, cancelled: 0 };
  entry.total++;
  if (row.status === 'confirmed' || row.status === 'completed' || row.status === 'cancelled') entry[row.status]++;
  counts.set(day, entry);
 }
 return counts;
}
