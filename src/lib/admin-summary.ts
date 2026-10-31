export type RevenueAppointment = {
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
  };
}
