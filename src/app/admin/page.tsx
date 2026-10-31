import { Suspense } from 'react';
import { loadAdminData, type AdminSection } from '@/lib/admin-data';
import { AdminContentLoading } from '@/components/admin-loading';
import { AdminNavLink } from '@/components/admin-nav-link';
import Link from 'next/link';
import { PawPrint, CalendarDays, LayoutDashboard, Users, Settings2, ArrowUpRight } from 'lucide-react';
import { AdminFinances, AdminAgenda, AdminRegistry } from '@/components/admin-views';
import { AdminFilters } from '@/components/admin-filters';
import { requireAdmin } from '@/lib/admin';
import { localDate } from '@/lib/format';
import { adminPeriod } from '@/lib/admin-period';
import { saveRecord } from './actions';
import { logout } from './login/actions';
import { HoursEditor, BlocksEditor } from '@/components/admin-availability';
export const dynamic='force-dynamic';
type Row={id:string;name:string};
function Select({name,rows,optional=false}:{name:string;rows:Row[];optional?:boolean}){return <select name={name} required={!optional}>{optional&&<option value="">Toda a loja</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}
type Params={date?:string;view?:string;month?:string;from?:string;to?:string;professional?:string;service?:string;section?:string;tab?:string;error?:string;saved?:string};
export default async function Admin({searchParams}:{searchParams:Promise<Params>}){
 const {db,role}=await requireAdmin(); const params=await searchParams;
 const period=adminPeriod(params,localDate());
 const section=['overview','agenda','registrations','settings'].includes(params.section??'')?params.section as AdminSection:'overview';
 const nav=[{id:'overview',label:'Visão geral',icon:LayoutDashboard},{id:'agenda',label:'Agenda',icon:CalendarDays},{id:'registrations',label:'Cadastros',icon:Users},{id:'settings',label:'Disponibilidade',icon:Settings2}];
 function href(id:string){const query=new URLSearchParams();for(const [key,value]of Object.entries(params))if(value&&!['error','saved','tab'].includes(key))query.set(key,value);query.set('section',id);return '/admin?'+query.toString();}
 return <div className="admin-shell dashboard-shell"><aside className="admin-nav"><Link className="brand" href="/"><span className="dashboard-brand-icon"><PawPrint size={23}/></span>patinhas & cia</Link><span className="eyebrow">PAINEL DE GESTÃO</span><nav aria-label="Menu administrativo">{nav.map(({id,label,icon:Icon})=><AdminNavLink key={id} href={href(id)} active={section===id}><Icon size={19}/>{label}</AdminNavLink>)}{role==='owner'&&<AdminNavLink href="/admin/contas"><Users size={19}/>Contas da equipe</AdminNavLink>}</nav><div className="dashboard-nav-footer"><Link href="/" className="text-link">Ver site público <ArrowUpRight size={15}/></Link><span className="role-label">{role==='owner'?'Acesso de responsável':'Acesso da equipe'}</span><form action={logout}><button className="text-link">Sair da conta</button></form></div></aside>
 <main className="admin-content"><header className="dashboard-header"><div><div className="eyebrow">ORGANIZAÇÃO PARA CUIDAR MELHOR</div><h1>{nav.find(item=>item.id===section)?.label}</h1><p className="muted">Tudo o que você precisa para acompanhar seu petshop.</p></div><span className="dashboard-date"><CalendarDays size={16}/>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeZone:'America/Fortaleza'}).format(new Date())}</span></header>
 <Suspense key={[section,period.begin,period.end,params.professional,params.service].join('|')} fallback={<AdminContentLoading/>}><AdminContent section={section} period={period} params={params} db={db} role={role} agendaHref={href('agenda')}/></Suspense>
 </main></div>;
}

async function AdminContent({section,period,params,db,role,agendaHref}:{section:AdminSection;period:ReturnType<typeof adminPeriod>;params:Params;db:Awaited<ReturnType<typeof requireAdmin>>['db'];role:'owner'|'staff';agendaHref:string}){
 const {appointments,revenue,services,professionals,customers,pets,hours,blocks,settings,links,failed}=await loadAdminData(db,section,period,params,role);
 const a=appointments.data??[],s=services.data??[],p=professionals.data??[],c=customers.data??[];
 return <>
 {failed&&<p role="alert" className="error">Alguns dados não puderam ser carregados. Os resultados podem estar incompletos; tente atualizar a página.</p>}{params.error&&<p role="alert" className="error">{params.error==='slot'?'Horário indisponível. A alteração não foi salva.':'Não foi possível salvar. Confira os campos e as permissões.'}</p>}{params.saved&&<p role="status" className="success-notice">Alterações salvas.</p>}
 {['overview','agenda'].includes(section)&&<AdminFilters key={[period.view,period.month,period.day,period.from,period.to,section,params.professional,params.service].join('|')} period={period} professionals={p} services={s} professional={params.professional} service={params.service} section={section}/>}
 {section==='overview'&&<><AdminFinances appointments={revenue.data??[]} from={period.from} to={period.to}/><div className="dashboard-next"><div><h3>Pronto para organizar os próximos cuidados?</h3><p>Veja os atendimentos e atualize a situação de cada visita.</p></div><Link className="button small" href={agendaHref}>Abrir agenda <ArrowUpRight size={16}/></Link></div></>}
 {section==='agenda'&&<AdminAgenda key={`${period.from}:${period.to}`} appointments={a} from={period.from} to={period.to} today={localDate()}/>}
 {section==='registrations'&&<AdminRegistry customers={c} professionals={p} services={s} pets={pets.data??[]} links={links.data??[]} initialTab={params.tab}/>}
 {section==='settings'&&<section id="horarios"><h2>Expediente e disponibilidade</h2><div className="admin-grid"><div className="admin-card"><h3>Intervalos de trabalho</h3><p className="muted">Cadastre manhã e tarde separadamente para reservar a pausa. Dias sem intervalos ficam indisponíveis.</p><HoursEditor hours={hours.data??[]} professionals={p}/><form action={saveRecord}><input type="hidden" name="entity" value="working_hours"/><label>Profissional<Select name="professional_id" rows={p}/></label><label>Dia<select name="weekday">{['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><div className="field-grid"><label>Início<input type="time" name="opens" required/></label><label>Fim<input type="time" name="closes" required/></label></div><button className="button small">Adicionar intervalo</button></form></div><div className="admin-card"><h3>Bloqueios, folgas e feriados</h3><BlocksEditor blocks={blocks.data??[]} professionals={p}/><form action={saveRecord}><input type="hidden" name="entity" value="availability_exceptions"/><label>Profissional<Select name="professional_id" rows={p} optional/></label><label>Início (Fortaleza)<input type="datetime-local" name="starts_at" required/></label><label>Fim (Fortaleza)<input type="datetime-local" name="ends_at" required/></label><label>Motivo<input name="reason" required/></label><button className="button small">Bloquear período</button></form></div>{role==='owner'&&<div className="admin-card"><h3>Regras de alterações públicas</h3><form action={saveRecord}><input type="hidden" name="entity" value="booking_settings"/><label>Antecedência para cancelar (horas)<input type="number" name="cancellation_hours" defaultValue={settings?.cancellation_hours} min={0}/></label><label>Antecedência para reagendar (horas)<input type="number" name="reschedule_hours" defaultValue={settings?.reschedule_hours} min={0}/></label><label>Horizonte da agenda (dias)<input type="number" name="horizon_days" defaultValue={settings?.horizon_days} min={1} max={365}/></label><button className="button small">Salvar regras</button></form></div>}</div></section>}

 </>;
}
