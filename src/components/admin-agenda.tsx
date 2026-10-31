'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, PawPrint, UserRound, Phone, Mail, Check, CalendarClock, CircleSlash, ArrowUpRight } from 'lucide-react';
import { changeAppointment } from '@/app/admin/actions';
import { money, time } from '@/lib/format';
import { shiftMonth } from '@/lib/availability';
import { validDay } from '@/lib/admin-period';
import { appointmentDay, calendarCells, calendarCounts, moveDay } from '@/lib/admin-calendar';

export type Appointment = { id: string; reference: number; starts_at: string; ends_at: string; price_cents: number; status: string; customers: { name: string; phone: string; email: string } | null; pets: { name: string } | null; services: { name: string } | null; professionals: { name: string } | null };
const labels: Record<string, string> = { confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado' };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const formatDay = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

export function AdminAgenda({ appointments, from, to, today }: { appointments: Appointment[]; from: string; to: string; today: string }) {
 const router = useRouter();
 const params = useSearchParams();
 const requestedDay = params.get('selected_day') ?? undefined;
 const initial = validDay(requestedDay) && requestedDay >= from && requestedDay <= to ? requestedDay : today >= from && today <= to ? today : from;
 const [selected, setSelected] = useState(initial);
 const [month, setMonth] = useState(initial.slice(0, 7));
 const [search, setSearch] = useState('');
 const [status, setStatus] = useState('all');
 const [pending, startTransition] = useTransition();
 const filtered = appointments.filter(row => (status === 'all' || row.status === status) && normalize([row.reference, row.customers?.name, row.customers?.phone, row.customers?.email, row.pets?.name, row.services?.name, row.professionals?.name].join(' ')).includes(normalize(search.trim())));
 const counts = calendarCounts(filtered);
 const dayRows = filtered.filter(row => appointmentDay(row.starts_at) === selected).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
 const activeRows = dayRows.filter(row => row.status !== 'cancelled');
 const completedValue = dayRows.filter(row => row.status === 'completed').reduce((sum, row) => sum + row.price_cents, 0);
 const forecast = dayRows.filter(row => row.status === 'confirmed').reduce((sum, row) => sum + row.price_cents, 0);
 const returnParams = new URLSearchParams(params.toString());
 returnParams.set('selected_day', selected);
 const returnQuery = returnParams.toString();

 function selectDay(day: string) {
  setSelected(day);
  setMonth(day.slice(0, 7));
 }
 function navigateMonth(target: string, focusDay?: string) {
  if (target < '2000-01' || target > '2100-12') return;
  const monthBegin = `${target}-01`;
  const monthEnd = moveDay(`${shiftMonth(target, 1)}-01`, -1);
  if (monthBegin <= to && monthEnd >= from) {
   selectDay(focusDay && focusDay >= from && focusDay <= to ? focusDay : monthBegin < from ? from : monthBegin);
   return;
  }
  const query = new URLSearchParams(params.toString());
  for (const key of ['date', 'from', 'to', 'error', 'saved']) query.delete(key);
  query.set('section', 'agenda'); query.set('view', 'month'); query.set('month', target);
  query.set('selected_day', focusDay ?? monthBegin);
  startTransition(() => router.push(`/admin?${query}`, { scroll: false }));
 }

 return <section id="agenda" className="appointment-workspace" aria-busy={pending}>
  <div className="agenda-topline"><div><span className="chart-kicker">CADA CUIDADO TEM SEU HORÁRIO</span><h2>Calendário de atendimentos</h2><p className="muted">Selecione um dia para acompanhar as visitas e organizar os próximos cuidados.</p></div><span className="agenda-timezone"><Clock3 size={14}/>Horário de Fortaleza</span></div>
  <div className="calendar-workspace">
   <div className="admin-card appointment-calendar">
    <div className="appointment-calendar-head"><div><span className="chart-kicker">SUA AGENDA</span><h3 aria-live="polite">{formatDay(`${month}-01`, { month: 'long', year: 'numeric' })}</h3></div><div className="calendar-navigation"><button type="button" aria-label="Mês anterior" disabled={pending || month <= '2000-01'} onClick={() => navigateMonth(shiftMonth(month, -1))}><ChevronLeft size={18}/></button><button type="button" aria-label="Próximo mês" disabled={pending || month >= '2100-12'} onClick={() => navigateMonth(shiftMonth(month, 1))}><ChevronRight size={18}/></button></div></div>
    <div className="calendar-month-meta"><span>{filtered.filter(row => appointmentDay(row.starts_at).startsWith(month)).length} atendimento(s) neste mês</span><button type="button" className="calendar-today" disabled={pending} onClick={() => navigateMonth(today.slice(0, 7), today)}>Hoje</button></div>
    <div className="appointment-weekdays" aria-hidden="true">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="appointment-month-grid" role="group" aria-label="Dias do calendário" onKeyDown={event => {
     const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
     if (!(event.key in moves)) return;
     const current = (event.target as HTMLElement).dataset.day;
     if (!current) return;
     event.preventDefault();
     const next = moveDay(current, moves[event.key]);
     if (next < from || next > to) return;
     selectDay(next);
     requestAnimationFrame(() => document.getElementById(`agenda-day-${next}`)?.focus());
    }}>
     {calendarCells(month).map(day => {
      const entry = counts.get(day);
      const outside = !day.startsWith(month);
      const unavailable = day < from || day > to;
      return <button type="button" id={`agenda-day-${day}`} data-day={day} key={day} disabled={pending || unavailable} aria-pressed={day === selected} aria-current={day === today ? 'date' : undefined} aria-label={`${formatDay(day, { dateStyle: 'full' })}: ${unavailable ? 'fora do período filtrado' : `${entry?.total ?? 0} atendimento(s)`}`} className={`appointment-day ${outside ? 'outside' : ''} ${day === selected ? 'selected' : ''} ${day === today ? 'today' : ''}`} onClick={() => selectDay(day)}>
       <span className="day-number">{Number(day.slice(-2))}</span>
       <span className="day-dots" aria-hidden="true">{Boolean(entry?.confirmed) && <i className="confirmed"/>}{Boolean(entry?.completed) && <i className="completed"/>}{Boolean(entry?.cancelled) && <i className="cancelled"/>}</span>
       {Boolean(entry?.total) && <small>{entry!.total}<span> atend.</span></small>}
      </button>;
     })}
    </div>
    <div className="appointment-calendar-legend"><span><i className="confirmed"/>Confirmados</span><span><i className="completed"/>Concluídos</span><span><i className="cancelled"/>Cancelados</span></div>
    <p className="calendar-help">As marcações acompanham os filtros. Dias sem reservas não indicam disponibilidade. Ao navegar para fora do período, o filtro passa para o mês escolhido.</p>
    <div className="calendar-month-summary"><CalendarDays size={18}/><div><strong>{appointments.length} reserva(s) no período</strong><span>{from.split('-').reverse().join('/')} — {to.split('-').reverse().join('/')}</span></div></div>
   </div>
   <div className="day-detail-panel">
    <header className="day-detail-heading"><div className="day-date-tile"><span>{formatDay(selected, { weekday: 'short' }).replace('.', '')}</span><strong>{Number(selected.slice(-2))}</strong></div><div><span className="chart-kicker">{selected === today ? 'AGENDA DE HOJE' : 'DIA SELECIONADO'}</span><h3>{formatDay(selected, { day: 'numeric', month: 'long' })}</h3><p>{dayRows.length} visita(s) · {activeRows.length} atendimento(s) ativo(s)</p></div><span className="selected-year">{selected.slice(0, 4)}</span></header>
    <div className="day-value-summary"><div><span>Concluídos no dia</span><strong>{money(completedValue)}</strong></div><div><span>Previsto em agenda</span><strong>{money(forecast)}</strong></div></div>
    <div className="day-search-controls"><label><Search size={16}/><span className="sr-only">Buscar atendimento</span><input type="search" placeholder="Buscar cliente, pet ou serviço" value={search} onChange={event => setSearch(event.target.value)}/></label><label><span className="sr-only">Situação do atendimento</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todas as situações</option><option value="confirmed">Confirmados</option><option value="completed">Concluídos</option><option value="cancelled">Cancelados</option></select></label></div>
    {(search || status !== 'all') && <div className="day-filter-feedback"><span>{filtered.length} resultado(s) no período. Escolha um dia com marcação.</span><button type="button" onClick={() => { setSearch(''); setStatus('all'); }}>Limpar filtros</button></div>}
    <div className="day-appointments" aria-live="polite">
     {dayRows.map(row => <article className={`day-appointment ${row.status}`} key={row.id}>
      <div className="appointment-time"><strong>{time(row.starts_at)}</strong><span>{time(row.ends_at)}</span><i/></div>
      <div className="appointment-detail-card"><div className="appointment-card-top"><span className={`badge ${row.status}`}>{labels[row.status] ?? row.status}</span><span className="appointment-reference">#{row.reference}</span></div><div className="appointment-service-line"><h4>{row.services?.name ?? 'Serviço não encontrado'}</h4><strong>{money(row.price_cents)}</strong></div>
       <div className="appointment-people"><span><PawPrint size={15}/><strong>{row.pets?.name ?? 'Pet não encontrado'}</strong><small>· {row.customers?.name ?? 'Cliente não encontrado'}</small></span><span><UserRound size={15}/>{row.professionals?.name ?? 'Profissional não encontrado'}</span></div>
       <details className="appointment-contact"><summary>Contato do responsável <ArrowUpRight size={12}/></summary><div>{row.customers?.phone && <p><Phone size={13}/>{row.customers.phone}</p>}{row.customers?.email && <p><Mail size={13}/>{row.customers.email}</p>}</div></details>
       {row.status === 'confirmed' && <div className="appointment-actions">
        <form action={changeAppointment}><input type="hidden" name="return_query" value={returnQuery}/><input type="hidden" name="id" value={row.id}/><button name="action" value="complete" className="appointment-complete"><Check size={15}/>Concluir</button></form>
        <details><summary><CalendarClock size={14}/>Reagendar</summary><form action={changeAppointment}><input type="hidden" name="return_query" value={returnQuery}/><input type="hidden" name="id" value={row.id}/><input type="hidden" name="action" value="reschedule"/><label>Novo horário (Fortaleza)<input type="datetime-local" name="starts_at" required/></label><button className="button small">Salvar novo horário</button></form></details>
        <details className="appointment-cancel"><summary><CircleSlash size={14}/>Cancelar</summary><form action={changeAppointment}><input type="hidden" name="return_query" value={returnQuery}/><input type="hidden" name="id" value={row.id}/><input type="hidden" name="action" value="cancel"/><p>Deseja cancelar este atendimento?</p><button className="text-link danger">Confirmar cancelamento</button></form></details>
       </div>}
      </div>
     </article>)}
     {!dayRows.length && <div className="day-empty-state"><span><CalendarDays size={30}/></span><h4>Um espaço para novos cuidados</h4><p>{search || status !== 'all' ? 'Nenhum atendimento corresponde à busca neste dia. Limpe os filtros ou escolha outro dia no calendário.' : 'Não há reservas para este dia no período e nos filtros selecionados.'}</p><small>Selecione outra data no calendário ao lado.</small></div>}
    </div>
   </div>
  </div>
 </section>;
}
