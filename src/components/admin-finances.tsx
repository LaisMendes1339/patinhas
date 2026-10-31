import { Banknote, CheckCheck, TrendingUp, Ban } from 'lucide-react';
import { money } from '@/lib/format';
import { summarizeAppointments, type RevenueAppointment } from '@/lib/admin-summary';

export function AdminFinances({ appointments }: { appointments: RevenueAppointment[] }) {
  const summary = summarizeAppointments(appointments);
  return <section id="financeiro" aria-labelledby="finance-title">
    <div className="section-top admin-section-heading"><div><div className="eyebrow">VISÃO DOS VALORES</div><h2 id="finance-title">Financeiro</h2></div><p>Mesmo período e profissional selecionados na agenda.</p></div>
    <div className="finance-stats">
      <article className="admin-card finance-feature"><TrendingUp/><span>Previsto com os agendamentos</span><strong>{money(summary.forecast)}</strong><small>{summary.confirmed} atendimento(s) confirmado(s)</small></article>
      <article className="admin-card"><CheckCheck/><span>Serviços concluídos</span><strong>{money(summary.completedValue)}</strong><small>{summary.completed} atendimento(s) realizado(s)</small></article>
      <article className="admin-card"><Banknote/><span>Valor médio por atendimento</span><strong>{money(summary.average)}</strong><small>Confirmados e concluídos</small></article>
      <article className="admin-card"><Ban/><span>Valor dos cancelamentos</span><strong>{money(summary.cancelledValue)}</strong><small>{summary.cancelled} reserva(s), fora da previsão</small></article>
    </div>
    <p className="finance-note">Os valores usam o preço registrado em cada reserva. Concluir um atendimento não registra pagamento; esta visão acompanha a previsão e o valor dos serviços realizados.</p>
    <div className="admin-grid">{[
      { title: 'Valores por serviço', rows: summary.byService },
      { title: 'Valores por profissional', rows: summary.byProfessional },
    ].map(({ title, rows }) => <article className="admin-card" key={title}><h3>{title}</h3><p className="muted">Reservas confirmadas e concluídas no período.</p>{rows.length ? <ul className="revenue-list">{rows.map(row => <li key={row.name}><div className="revenue-row"><div><strong>{row.name}</strong><small>{row.count} atendimento(s)</small></div><b>{money(row.total)}</b></div><div className="revenue-track" aria-hidden="true"><span style={{ width: `${summary.total ? row.total / summary.total * 100 : 0}%` }}/></div></li>)}</ul> : <p className="empty">Nenhum valor previsto neste período.</p>}</article>)}</div>
  </section>;
}
