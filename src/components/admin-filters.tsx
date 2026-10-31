'use client';
import { useState } from 'react';
import { Filter, ArrowRight } from 'lucide-react';
import type { adminPeriod } from '@/lib/admin-period';

type Row = { id: string; name: string };
export function AdminFilters({ period, professionals, services, professional, service, section }: { period: ReturnType<typeof adminPeriod>; professionals: Row[]; services: Row[]; professional?: string; service?: string; section: string }) {
 const [view, setView] = useState(period.view);
 return <section className="dashboard-filters admin-card" aria-label="Filtros do painel"><div className="filter-heading"><Filter size={18}/><strong>Filtrar resultados</strong><span>Agenda e gráficos usam o mesmo período</span></div>
  <form action="/admin" className="filters">
   <input type="hidden" name="section" value={section}/>
   <label>Período<select name="view" value={view} onChange={e => setView(e.target.value)}><option value="month">Mês completo</option><option value="day">Um dia</option><option value="week">7 dias</option><option value="custom">Personalizado</option></select></label>
   {view === 'month' ? <label>Mês de referência<input type="month" name="month" defaultValue={period.month} min="2000-01" max="2100-12" required/></label> : view === 'custom' ? <><label>De<input type="date" name="from" defaultValue={period.from} required/></label><label>Até<input type="date" name="to" defaultValue={period.to} required/></label></> : <label>{view === 'week' ? 'A partir de' : 'Data'}<input type="date" name="date" defaultValue={period.day} required/></label>}
   <label>Profissional<select name="professional" defaultValue={professional ?? ''}><option value="">Todos os profissionais</option>{professionals.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
   <label>Serviço<select name="service" defaultValue={service ?? ''}><option value="">Todos os serviços</option>{services.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>
   <button type="submit" className="button small">Aplicar <ArrowRight size={16}/></button>
  </form>
 </section>;
}
