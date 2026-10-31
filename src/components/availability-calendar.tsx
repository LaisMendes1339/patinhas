'use client';
import { useEffect, useEffectEvent, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { monthDays, shiftMonth } from '@/lib/availability';
import { localDate } from '@/lib/format';

type Props = { service: string; professional: string; date: string; onChange: (date: string) => void; refresh: number };
type Dates = { key: string; values: string[]; error: string };
export function AvailabilityCalendar({ service, professional, date, onChange, refresh }: Props) {
 const [month, setMonth] = useState(date.slice(0, 7));
 const [result, setResult] = useState<Dates>({ key: '', values: [], error: '' });
 const key = `${service}:${professional}:${month}:${refresh}`;
 const loading = Boolean(service) && result.key !== key;
 const available = result.key === key ? result.values : [];
 const selectAvailableDate = useEffectEvent((dates: string[]) => {
   if (dates.length && !dates.includes(date)) onChange(dates[0]);
 });
 useEffect(() => {
   if (!service) return;
   const controller = new AbortController();
   const params = new URLSearchParams({ service, month });
   if (professional) params.set('professional', professional);
   fetch(`/api/availability/dates?${params}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]), cache: 'no-store' })
    .then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível consultar as datas.');
      if (controller.signal.aborted) return;
      setResult({ key, values: body.dates, error: '' });
      if (!body.dates.length && month === localDate().slice(0, 7)) setMonth(shiftMonth(month, 1));
      else selectAvailableDate(body.dates);
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ key, values: [], error: error.name === 'TimeoutError' ? 'A consulta demorou demais. Tente novamente.' : error.message });
    });
   return () => controller.abort();
 }, [service, professional, month, refresh, key]);
 const offset = new Date(`${month}-01T12:00:00-03:00`).getUTCDay();
 return <div className="calendar" aria-busy={loading}>
  <div className="calendar-head">
   <button type="button" aria-label="Mês anterior" disabled={month <= localDate().slice(0, 7)} onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={17}/></button>
   <strong>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' }).format(new Date(`${month}-01T12:00:00-03:00`))}</strong>
   <button type="button" aria-label="Próximo mês" disabled={month >= shiftMonth(localDate().slice(0, 7), 12)} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={17}/></button>
  </div>
  <div className="calendar-days">
   {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => <span className="weekday" key={i}>{day}</span>)}
   {Array.from({ length: offset }, (_, i) => <span key={`blank${i}`}/>)}
   {monthDays(month).map(day => <button type="button" aria-label={`${day}${!available.includes(day) ? ' indisponível' : ''}`} aria-pressed={day === date} disabled={!service || loading || !available.includes(day)} className={day === date ? 'selected' : ''} key={day} onClick={() => onChange(day)}>{Number(day.slice(-2))}</button>)}
  </div>
  <div className="calendar-legend" role="status">{loading ? <><LoaderCircle className="spin" size={13}/> Consultando datas…</> : !service ? 'Selecione um serviço para ver as datas.' : result.error ? <span role="alert">{result.error}</span> : available.length ? 'Datas em verde possuem horários livres.' : 'Nenhum horário neste mês. Consulte o próximo mês.'}</div>
 </div>;
}