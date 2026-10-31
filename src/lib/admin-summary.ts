export type RevenueAppointment = {
  starts_at?: string;
  price_cents: number;
  status: string;
  services: { name: string } | null;
  professionals: { name: string } | null;
};

export function summarizeAppointments(appointments: RevenueAppointment[]) {
  const confirmed = appointments.filter(item => item.status === 'confirmed');
  const completed = appointments.filter(item => item.status === 'completed');
  const cancelled = appointments.filter(item => item.status === 'cancelled');
  const active = [...confirmed, ...completed];
  const sum = (items: RevenueAppointment[]) => items.reduce((total, item) => total + item.price_cents, 0);
  const daily = new Map<string, { day: string; forecast: number; completed: number; count: number }>();
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' });
  for (const item of active) {
    if (!item.starts_at || !Number.isFinite(Date.parse(item.starts_at))) continue;
    const day = localDay.format(new Date(item.starts_at));
    const row = daily.get(day) ?? { day, forecast: 0, completed: 0, count: 0 };
    row.count++;
    if (item.status === 'confirmed') row.forecast += item.price_cents;
    else row.completed += item.price_cents;
    daily.set(day, row);
  }
  function groupBy(field: 'services' | 'professionals') {
    const groups = new Map<string, { name: string; count: number; total: number }>();
    for (const item of active) {
      const name = item[field]?.name ?? 'Sem cadastro';
      const group = groups.get(name) ?? { name, count: 0, total: 0 };
      group.count++;
      group.total += item.price_cents;
      groups.set(name, group);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }
  return {
    confirmed: confirmed.length, completed: completed.length, cancelled: cancelled.length,
    forecast: sum(confirmed), completedValue: sum(completed), cancelledValue: sum(cancelled),
    total: sum(active), average: active.length ? Math.round(sum(active) / active.length) : 0,
    byService: groupBy('services'), byProfessional: groupBy('professionals'),
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}
