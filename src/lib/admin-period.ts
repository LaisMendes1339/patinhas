type Params = { date?: string; view?: string; month?: string; from?: string; to?: string };
export function validDay(value: string | undefined): value is string {
 if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const date = new Date(`${value}T12:00:00Z`);
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100;
}
export function adminPeriod(params: Params, today: string) {
 const day = validDay(params.date) ? params.date : today;
 const view = ['day', 'week', 'month', 'custom'].includes(params.view ?? '') ? params.view! : 'month';
 const month = validDay(`${params.month}-01`) ? params.month! : day.slice(0, 7);
 let from = day, to = day;
 if (view === 'month') {
  from = `${month}-01`;
  to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12)).toISOString().slice(0, 10);
 } else if (view === 'week') {
  to = new Date(new Date(`${day}T12:00:00Z`).getTime() + 6 * 86400000).toISOString().slice(0, 10);
 } else if (view === 'custom') {
  from = validDay(params.from) ? params.from : today;
  to = validDay(params.to) ? params.to : from;
  // Keep the interval ordered and bounded to one year.
  if (to < from) to = from;
  if (new Date(to).getTime() - new Date(from).getTime() > 365 * 86400000) to = new Date(new Date(from).getTime() + 365 * 86400000).toISOString().slice(0, 10);
 }
 const begin = new Date(`${from}T00:00:00-03:00`).toISOString();
 const end = new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86400000).toISOString();
 const label = `${from.split('-').reverse().join('/')} a ${to.split('-').reverse().join('/')}`;
 return { view, day, month, from, to, begin, end, label };
}
