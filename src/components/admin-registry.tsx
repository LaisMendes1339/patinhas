'use client';
import { useState } from 'react';
import { Users, Scissors, PawPrint, UserRound, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { saveRecord } from '@/app/admin/actions';
import { LinksEditor } from './admin-availability';
import { money } from '@/lib/format';

type Customer = { id: string; name: string; email: string; phone: string };
type Professional = { id: string; name: string; active: boolean };
type Service = Professional & { description: string; duration_minutes: number; price_cents: number };
type Pet = { id: string; name: string; customer_id: string; species: string; breed: string };
const tabs = [{ id: 'customers', label: 'Clientes', icon: Users }, { id: 'professionals', label: 'Profissionais', icon: UserRound }, { id: 'services', label: 'Serviços', icon: Scissors }, { id: 'pets', label: 'Pets', icon: PawPrint }];
function Fields({ entity, id }: { entity: string; id?: string }) { return <><input type="hidden" name="entity" value={entity}/><input type="hidden" name="return_tab" value={entity}/>{id && <input type="hidden" name="id" value={id}/>}</>; }

export function AdminRegistry({ customers, professionals, services, pets, links, initialTab }: { customers: Customer[]; professionals: Professional[]; services: Service[]; pets: Pet[]; links: { professional_id: string; service_id: string }[]; initialTab?: string }) {
 const [tab, setTab] = useState(tabs.some(t => t.id === initialTab) ? initialTab! : 'customers');
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(0);
 const [showNew, setShowNew] = useState(false);
 const [status, setStatus] = useState('all');
 const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 const term = normalized(search.trim());
 const customerMap = new Map(customers.map(c => [c.id, c]));
 const source = tab === 'customers' ? customers : tab === 'professionals' ? professionals : tab === 'services' ? services : pets;
 const filtered = source.filter(row => {
  const extra = 'email' in row ? `${row.email} ${row.phone}` : 'customer_id' in row ? customerMap.get(row.customer_id)?.name ?? '' : '';
  return normalized(`${row.name} ${extra}`).includes(term) && (!('active' in row) || status === 'all' || row.active === (status === 'active'));
 });
 const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
 const currentPage = Math.min(page, pageCount - 1);
 const ids = new Set(filtered.slice(currentPage * 8, currentPage * 8 + 8).map(row => row.id));
 const title = tabs.find(t => t.id === tab)!.label;
 return <section id="cadastros"><div className="admin-section-heading"><div className="eyebrow">CADA DETALHE NO LUGAR</div><h2>Cadastros</h2><p className="muted">Clientes, equipe e serviços organizados em espaços próprios.</p></div>
  <div className="registry-tabs" role="tablist" aria-label="Tipos de cadastro">{tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="registry-panel" onClick={() => { setTab(id); setSearch(''); setPage(0); setShowNew(false); setStatus('all'); }} className={tab === id ? 'selected' : ''}><Icon size={18}/>{label}<span>{(id === 'customers' ? customers : id === 'professionals' ? professionals : id === 'services' ? services : pets).length}</span></button>)}</div>
  <div id="registry-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="admin-card registry-panel">
   <div className="registry-toolbar"><div><h3>{title}</h3><p className="muted">{filtered.length} registro(s) encontrado(s)</p></div><button type="button" className="button small" onClick={() => setShowNew(!showNew)}><Plus size={17}/>{showNew ? 'Fechar cadastro' : 'Novo cadastro'}</button></div>
   <div className="registry-search"><label><span className="sr-only">Buscar {title.toLowerCase()}</span><Search size={18}/><input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder={tab === 'customers' ? 'Buscar nome, e-mail ou telefone' : tab === 'pets' ? 'Buscar pet ou responsável' : 'Buscar pelo nome'}/></label>{['services', 'professionals'].includes(tab) && <label><span className="sr-only">Situação</span><select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="all">Ativos e inativos</option><option value="active">Somente ativos</option><option value="inactive">Somente inativos</option></select></label>}</div>
   {showNew && <div className="registry-new"><h3>Novo cadastro · {title}</h3><form action={saveRecord}>
    <Fields entity={tab}/>
    {tab === 'pets' && <label>Responsável<select name="customer_id" required defaultValue=""><option value="" disabled>Selecione um cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></label>}
    <label>Nome<input name="name" maxLength={200} required/></label>
    {tab === 'customers' && <div className="field-grid"><label>E-mail<input type="email" name="email" required/></label><label>Telefone<input type="tel" name="phone" placeholder="(85) 99999-9999" required/></label></div>}
    {tab === 'services' && <><label>Descrição<textarea name="description" maxLength={1000}/></label><div className="field-grid"><label>Duração (min)<input type="number" name="duration_minutes" min={15} max={480} step={15} required/></label><label>Preço (R$)<input type="number" name="price_reais" min={0} max={100000} step="0.01" placeholder="60,00" required/></label></div></>}
    {tab === 'pets' && <div className="field-grid"><label>Espécie<select name="species"><option value="dog">Cão</option><option value="cat">Gato</option></select></label><label>Raça<input name="breed" maxLength={80}/></label></div>}
    {['services', 'professionals'].includes(tab) && <input type="hidden" name="active" value="true"/>}
    <button type="submit" className="button small">Salvar cadastro</button>
   </form></div>}
   <div className="registry-items">
    {tab === 'customers' && customers.filter(c => ids.has(c.id)).map(c => <details key={c.id}><summary><span className="record-avatar">{c.name.slice(0, 1).toUpperCase()}</span><span><strong>{c.name}</strong><small>{c.email} · {c.phone}</small></span><span className="record-meta">{pets.filter(p => p.customer_id === c.id).length} pet(s) · Editar</span></summary><form action={saveRecord}><Fields entity="customers" id={c.id}/><label>Nome<input name="name" defaultValue={c.name} required/></label><div className="field-grid"><label>E-mail<input type="email" name="email" defaultValue={c.email} required/></label><label>Telefone<input type="tel" name="phone" defaultValue={c.phone} required/></label></div><button className="button small">Salvar cliente</button></form></details>)}
    {tab === 'professionals' && professionals.filter(p => ids.has(p.id)).map(p => <details key={p.id}><summary><span className="record-avatar"><UserRound size={20}/></span><span><strong>{p.name}</strong><small>{links.filter(link => link.professional_id === p.id).length} serviço(s) vinculado(s)</small></span><span className={`badge ${p.active ? 'confirmed' : 'cancelled'}`}>{p.active ? 'Ativo' : 'Inativo'}</span></summary><form action={saveRecord}><Fields entity="professionals" id={p.id}/><label>Nome<input name="name" defaultValue={p.name} required/></label><label className="checkbox"><input type="checkbox" name="active" defaultChecked={p.active}/>Disponível para agendamentos</label><button className="button small">Salvar profissional</button></form><h4>Serviços deste profissional</h4><LinksEditor links={links.filter(link => link.professional_id === p.id)} professionals={professionals} services={services}/><form action={saveRecord}><Fields entity="professional_services"/><input type="hidden" name="professional_id" value={p.id}/><label>Adicionar serviço<select name="service_id" required defaultValue=""><option value="" disabled>Selecione um serviço</option>{services.filter(s => !links.some(link => link.professional_id === p.id && link.service_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="button small">Vincular serviço</button></form></details>)}
    {tab === 'services' && services.filter(s => ids.has(s.id)).map(s => <details key={s.id}><summary><span className="record-avatar"><Scissors size={20}/></span><span><strong>{s.name}</strong><small>{s.duration_minutes} minutos · {money(s.price_cents)}</small></span><span className={`badge ${s.active ? 'confirmed' : 'cancelled'}`}>{s.active ? 'Ativo' : 'Inativo'}</span></summary><form action={saveRecord}><Fields entity="services" id={s.id}/><label>Nome<input name="name" defaultValue={s.name} required/></label><label>Descrição<textarea name="description" defaultValue={s.description}/></label><div className="field-grid"><label>Duração (min)<input type="number" name="duration_minutes" defaultValue={s.duration_minutes} min={15} max={480} step={15} required/></label><label>Preço (R$)<input type="number" name="price_reais" defaultValue={(s.price_cents/100).toFixed(2)} min={0} max={100000} step="0.01" required/></label></div><label className="checkbox"><input type="checkbox" name="active" defaultChecked={s.active}/>Serviço ativo</label><button className="button small">Salvar serviço</button></form></details>)}
    {tab === 'pets' && pets.filter(p => ids.has(p.id)).map(p => <details key={p.id}><summary><span className="record-avatar"><PawPrint size={20}/></span><span><strong>{p.name}</strong><small>{p.species === 'dog' ? 'Cão' : 'Gato'} · {customerMap.get(p.customer_id)?.name ?? 'Responsável não encontrado'}</small></span><span className="record-meta">Editar</span></summary><form action={saveRecord}><Fields entity="pets" id={p.id}/><label>Nome<input name="name" defaultValue={p.name} required/></label><label>Responsável<select name="customer_id" defaultValue={p.customer_id} required>{customers.map(c => <option value={c.id} key={c.id}>{c.name} · {c.email}</option>)}</select></label><div className="field-grid"><label>Espécie<select name="species" defaultValue={p.species}><option value="dog">Cão</option><option value="cat">Gato</option></select></label><label>Raça<input name="breed" defaultValue={p.breed ?? ''}/></label></div><button className="button small">Salvar pet</button></form></details>)}
    {!filtered.length && <p className="empty">Nenhum registro encontrado. Altere a busca ou adicione um cadastro.</p>}
   </div>
   <div className="registry-pagination"><span>Página {currentPage + 1} de {pageCount}</span><div><button type="button" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18}/></button><button type="button" aria-label="Próxima página" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18}/></button></div></div>
  </div>
 </section>;
}
