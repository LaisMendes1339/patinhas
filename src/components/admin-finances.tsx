'use client';
import { useState } from 'react';
import { Banknote, CheckCheck, TrendingUp, CalendarDays, Trophy, ChartNoAxesCombined } from 'lucide-react';
import { money } from '@/lib/format';
import { summarizeAppointments, type RevenueAppointment } from '@/lib/admin-summary';

const colors = ['#176b53', '#e1a354', '#799ec5', '#a99aca', '#8cad78', '#d48779'];
type Group = { name: string; count: number; total: number };
function Ranking({ title, rows, metric }: { title: string; rows: Group[]; metric: 'count' | 'total' }) {
 const sorted = [...rows].sort((a, b) => b[metric] - a[metric]);
 const max = Math.max(1, ...sorted.map(row => row[metric]));
 const total = sorted.reduce((sum, row) => sum + row[metric], 0);
 return <article className="admin-card dashboard-ranking"><div className="chart-heading"><div><span className="chart-kicker">RANKING DO PERÍODO</span><h3>{title}</h3></div><Trophy size={20}/></div>
  {sorted.length ? <ol className="ranking-list">{sorted.map((row, index) => <li key={row.name}><div className="ranking-caption"><span><i>{index + 1}</i>{row.name}</span><strong>{metric === 'total' ? money(row.total) : `${row.count} atend.`}</strong></div><div className="ranking-track"><span style={{ width: `${row[metric] / max * 100}%`, background: colors[index % colors.length] }}/></div><small>{row.count} atendimento(s) · {money(row.total)} · {total ? Math.round(row[metric] / total * 100) : 0}% do total</small></li>)}</ol> : <div className="chart-empty"><ChartNoAxesCombined/><p>Os resultados aparecerão com os primeiros atendimentos deste período.</p></div>}
 </article>;
}
export function AdminFinances({ appointments, from, to }: { appointments: RevenueAppointment[]; from: string; to: string }) {
 const [metric, setMetric] = useState<'count' | 'total'>('count');
 const [selected, setSelected] = useState<string | null>(null);
 const summary = summarizeAppointments(appointments);
 const activeCount = summary.confirmed + summary.completed;
 const states = [{ label: 'Confirmados', value: summary.confirmed, color: '#e1a354' }, { label: 'Concluídos', value: summary.completed, color: '#176b53' }, { label: 'Cancelados', value: summary.cancelled, color: '#d48779' }];
 const count = states.reduce((sum, state) => sum + state.value, 0);
 let offset = 0;
 const segments = states.map(state => { const start = offset; offset += count ? state.value / count * 100 : 0; return `${state.color} ${start}% ${offset}%`; });
 const totalDays = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
 // Monthly buckets keep custom intervals readable without dropping any values.
 const monthly = totalDays > 62;
 const buckets = new Map<string, { label: string; forecast: number; completed: number }>();
 for (let day = new Date(`${from}T12:00:00Z`); day.toISOString().slice(0, 10) <= to; day.setUTCDate(day.getUTCDate() + 1)) {
  const iso = day.toISOString().slice(0, 10), key = monthly ? iso.slice(0, 7) : iso;
  if (!buckets.has(key)) buckets.set(key, { label: monthly ? `${key.slice(5, 7)}/${key.slice(0, 4)}` : `${key.slice(8, 10)}/${key.slice(5, 7)}`, forecast: 0, completed: 0 });
 }
 for (const row of summary.daily) {
  const bucket = buckets.get(monthly ? row.day.slice(0, 7) : row.day);
  if (bucket) { bucket.forecast += row.forecast; bucket.completed += row.completed; }
 }
 const series = [...buckets.entries()];
 const max = Math.max(1, ...series.map(([, row]) => row.forecast + row.completed));
 const selectedRow = series.find(([key]) => key === selected) ?? [...series].reverse().find(([, row]) => row.forecast + row.completed > 0) ?? series[0];
 return <section id="financeiro" className="dashboard-overview" aria-labelledby="finance-title">
  <div className="dashboard-section-top"><div><div className="eyebrow">SEU NEGÓCIO EM NÚMEROS</div><h2 id="finance-title">Visão geral</h2></div><span className="period-pill"><CalendarDays size={15}/>{from.split('-').reverse().join('/')} — {to.split('-').reverse().join('/')}</span></div>
  <div className="dashboard-kpis">
   <article className="admin-card kpi-primary"><span className="kpi-icon"><CheckCheck size={21}/></span><span>Valor dos serviços concluídos</span><strong>{money(summary.completedValue)}</strong><small>{summary.completed} atendimento(s) realizado(s)</small></article>
   <article className="admin-card"><span className="kpi-icon gold"><TrendingUp size={21}/></span><span>Previsto em agenda</span><strong>{money(summary.forecast)}</strong><small>{summary.confirmed} reserva(s) confirmada(s)</small></article>
   <article className="admin-card"><span className="kpi-icon blue"><CalendarDays size={21}/></span><span>Atendimentos ativos</span><strong>{activeCount}</strong><small>Confirmados e concluídos no período</small></article>
   <article className="admin-card"><span className="kpi-icon purple"><Banknote size={21}/></span><span>Ticket médio</span><strong>{money(summary.average)}</strong><small>Valor médio dos atendimentos ativos</small></article>
  </div>
  <p className="finance-note">Valores das reservas no período selecionado. Serviços concluídos não comprovam pagamento recebido; despesas e lucro líquido não são calculados.</p>
  <div className="dashboard-charts"><article className="admin-card trend-card"><div className="chart-heading"><div><span className="chart-kicker">ACOMPANHE A EVOLUÇÃO</span><h3>Valores {monthly ? 'por mês' : 'por dia'}</h3></div><div className="chart-legend"><span><i style={{ background: '#176b53' }}/>Concluídos</span><span><i style={{ background: '#e1a354' }}/>Previstos</span></div></div>
   {selectedRow && <p className="chart-readout" aria-live="polite"><strong>{selectedRow[1].label}</strong><span>Concluídos: {money(selectedRow[1].completed)}</span><span>Previstos: {money(selectedRow[1].forecast)}</span></p>}
   <div className="trend-scale"><span>{money(max)}</span><span>{money(Math.round(max / 2))}</span><span>R$ 0</span></div>
   <div className="trend-bars" role="group" aria-label="Selecione uma coluna para consultar os valores"><div className="trend-grid"/>{series.map(([key, row], index) => <button type="button" className={`trend-column ${selectedRow?.[0] === key ? 'active' : ''}`} key={key} onClick={() => setSelected(key)} aria-pressed={selectedRow?.[0] === key} aria-label={`${row.label}: concluídos ${money(row.completed)}, previstos ${money(row.forecast)}`} title={`${row.label}: ${money(row.completed + row.forecast)}`}><span className="trend-stack" style={{ height: `${Math.max(1, (row.forecast + row.completed) / max * 100)}%` }}><span style={{ height: `${row.forecast + row.completed ? row.forecast / (row.forecast + row.completed) * 100 : 0}%`, background: '#e1a354' }}/><span style={{ height: `${row.forecast + row.completed ? row.completed / (row.forecast + row.completed) * 100 : 0}%`, background: '#176b53' }}/></span><small>{series.length <= 12 || index % Math.ceil(series.length / 8) === 0 ? row.label : ''}</small></button>)}</div>
   {!activeCount && <p className="muted">Sem atendimentos ativos no período selecionado.</p>}
  </article><article className="admin-card status-card"><span className="chart-kicker">COMO ESTÁ A AGENDA</span><h3>Situação das reservas</h3><div className="status-donut" role="img" aria-label={states.map(s => `${s.label}: ${s.value}`).join(', ')} style={{ background: count ? `conic-gradient(${segments.join(',')})` : '#edf0ed' }}><div><strong>{count}</strong><span>reservas</span></div></div><ul className="status-legend">{states.map(state => <li key={state.label}><span><i style={{ background: state.color }}/>{state.label}</span><strong>{state.value}<small>{count ? Math.round(state.value / count * 100) : 0}%</small></strong></li>)}</ul><p className="muted">Cancelamentos: {money(summary.cancelledValue)}, fora dos valores ativos.</p></article></div>
  <div className="dashboard-section-top ranking-heading"><div><h3>O que movimenta seu petshop</h3><p className="muted">Reservas confirmadas e concluídas. Alterne a forma de comparar.</p></div><div className="metric-toggle" aria-label="Métrica dos rankings"><button type="button" aria-pressed={metric === 'count'} onClick={() => setMetric('count')}>Atendimentos</button><button type="button" aria-pressed={metric === 'total'} onClick={() => setMetric('total')}>Valores</button></div></div>
  <div className="dashboard-charts equal"><Ranking title="Serviços mais utilizados" rows={summary.byService} metric={metric}/><Ranking title="Desempenho dos profissionais" rows={summary.byProfessional} metric={metric}/></div>
 </section>;
}
