'use client';
import { Fragment, useState } from 'react';
import { Eye, EyeOff, UserRound, Scissors, Settings2 } from 'lucide-react';
import { saveRecord } from '@/app/admin/actions';
import { LinksEditor } from './admin-availability';

type Professional = { id: string; name: string; active: boolean };
type Service = { id: string; name: string; active: boolean };
type Link = { professional_id: string; service_id: string };

export function ProfessionalTable({ professionals, services, links }: { professionals: Professional[]; services: Service[]; links: Link[] }) {
 const [expanded, setExpanded] = useState<string | null>(null);
 return <div className="professionals-table-wrap"><table className="professionals-table">
  <caption className="sr-only">Profissionais, serviços oferecidos e situação do cadastro</caption>
  <thead><tr><th scope="col">Nome do profissional</th><th scope="col">Serviços</th><th scope="col">Status e ações</th></tr></thead>
  <tbody>{professionals.map(professional => {
   const assigned = links.filter(link => link.professional_id === professional.id);
   const available = services.filter(service => service.active && !assigned.some(link => link.service_id === service.id));
   const open = expanded === professional.id;
   return <Fragment key={professional.id}>
    <tr className={open ? 'professional-row expanded' : 'professional-row'}>
     <th scope="row"><div className="professional-identity"><span className="record-avatar"><UserRound size={19}/></span><div><strong>{professional.name}</strong><small>{assigned.length} serviço(s) vinculado(s)</small></div></div></th>
     <td><div className="professional-service-tags">{assigned.length ? assigned.map(link => {
      const service = services.find(service => service.id === link.service_id);
      return <span key={link.service_id} className={service?.active ? '' : 'inactive-service'}><Scissors size={11}/>{service?.name ?? 'Serviço não encontrado'}{service && !service.active && <small>Inativo</small>}</span>;
     }) : <span className="professional-no-service">Nenhum serviço vinculado</span>}</div></td>
     <td><div className="professional-status-actions"><span className={`professional-status ${professional.active ? 'active' : 'inactive'}`}><i/>{professional.active ? 'Ativo' : 'Inativo'}</span><button type="button" className="professional-view-button" onClick={() => setExpanded(open ? null : professional.id)} aria-expanded={open} aria-controls={`professional-actions-${professional.id}`} aria-label={`${open ? 'Fechar' : 'Ver'} ações de ${professional.name}`} title={`${open ? 'Fechar' : 'Ver'} detalhes e ações`}>{open ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></td>
    </tr>
    {open && <tr className="professional-expanded-row"><td colSpan={3}>
     <div className="professional-action-panel" id={`professional-actions-${professional.id}`} role="region" aria-label={`Ações de ${professional.name}`}>
      <header><span><Settings2 size={17}/><strong>Gerenciar profissional</strong></span><p>Atualize o nome, a situação e os serviços que este profissional realiza.</p></header>
      <div className="professional-edit-grid">
       <form action={saveRecord} className="professional-profile-form"><input type="hidden" name="entity" value="professionals"/><input type="hidden" name="return_tab" value="professionals"/><input type="hidden" name="id" value={professional.id}/><label>Nome do profissional<input name="name" maxLength={200} defaultValue={professional.name} required/></label><label className="checkbox"><input type="checkbox" name="active" defaultChecked={professional.active}/>Ativo para novos agendamentos</label><p className="muted">Ao desativar, o histórico e as reservas existentes são preservados.</p><button type="submit" className="button small">Salvar alterações</button></form>
       <div className="professional-services-editor"><h4>Serviços vinculados</h4><LinksEditor links={assigned} professionals={professionals} services={services}/>{!assigned.length && <p className="muted">Vincule um serviço para habilitar este profissional no agendamento.</p>}<form action={saveRecord}><input type="hidden" name="entity" value="professional_services"/><input type="hidden" name="return_tab" value="professionals"/><input type="hidden" name="professional_id" value={professional.id}/><label>Adicionar serviço<select name="service_id" required defaultValue="" disabled={!available.length}><option value="" disabled>{available.length ? 'Selecione um serviço' : 'Nenhum serviço disponível para adicionar'}</option>{available.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><button type="submit" className="button small" disabled={!available.length}>Vincular serviço</button></form></div>
      </div>
     </div>
    </td></tr>}
   </Fragment>;
  })}</tbody>
 </table></div>;
}
