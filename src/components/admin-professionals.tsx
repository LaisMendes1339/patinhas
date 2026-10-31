'use client';
import { useActionState, useState } from 'react';
import { Eye, Pencil, Trash2, UserRound, Scissors, ShieldCheck } from 'lucide-react';
import { updateProfessional, deleteProfessional, changeProfessionalService } from '@/app/admin/professional-actions';
import { AdminModal } from './admin-modal';

type Professional = { id: string; name: string; active: boolean };
type Service = { id: string; name: string; active: boolean };
type Link = { professional_id: string; service_id: string };
type Mode = 'view' | 'edit' | 'delete';

function ServiceManager({ professional, services, links }: { professional: Professional; services: Service[]; links: Link[] }) {
 const [state, action, pending] = useActionState(changeProfessionalService, {});
 const assigned = links.filter(link => link.professional_id === professional.id);
 const available = services.filter(service => service.active && !assigned.some(link => link.service_id === service.id));
 return <div className="modal-service-manager"><h3>Serviços realizados</h3>
  {state.error && <p className="error" role="alert">{state.error}</p>}{state.success && <p className="success-notice" role="status">Serviços atualizados.</p>}
  <ul>{assigned.map(link => <li key={link.service_id}><span><Scissors size={14}/>{services.find(service => service.id === link.service_id)?.name ?? 'Serviço não encontrado'}</span><form action={action}><input type="hidden" name="professional_id" value={professional.id}/><input type="hidden" name="service_id" value={link.service_id}/><input type="hidden" name="operation" value="remove"/><button type="submit" className="text-link danger" disabled={pending} aria-label={`Remover vínculo de ${services.find(service => service.id === link.service_id)?.name ?? 'serviço'}`}>Remover vínculo</button></form></li>)}</ul>
  {!assigned.length && <p className="muted">Nenhum serviço vinculado.</p>}
  <form action={action}><input type="hidden" name="professional_id" value={professional.id}/><input type="hidden" name="operation" value="add"/><label>Adicionar serviço<select name="service_id" required defaultValue="" disabled={!available.length || pending}><option value="" disabled>{available.length ? 'Selecione um serviço' : 'Todos os serviços ativos já estão vinculados'}</option>{available.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><button type="submit" className="button small" disabled={!available.length || pending}>{pending ? 'Salvando…' : 'Vincular serviço'}</button></form>
 </div>;
}

function EditProfessional({ professional, services, links }: { professional: Professional; services: Service[]; links: Link[] }) {
 const [state, action, pending] = useActionState(updateProfessional, {});
 return <><form action={action} className="modal-professional-form">
  <input type="hidden" name="id" value={professional.id}/>
  {state.error && <p className="error" role="alert">{state.error}</p>}{state.success && <p className="success-notice" role="status">Alterações salvas.</p>}
  <label>Nome do profissional<input name="name" maxLength={200} defaultValue={professional.name} required disabled={pending}/></label>
  <label className="checkbox"><input type="checkbox" name="active" defaultChecked={professional.active} disabled={pending}/>Ativo para novos agendamentos</label>
  <p className="muted">Desativar preserva o histórico e as reservas existentes.</p>
  <button type="submit" className="button small" disabled={pending}>{pending ? 'Salvando…' : 'Salvar alterações'}</button>
 </form><ServiceManager professional={professional} services={services} links={links}/></>;
}

function DeleteProfessional({ professional, onClose, onEdit }: { professional: Professional; onClose: () => void; onEdit: () => void }) {
 const [state, action, pending] = useActionState(deleteProfessional, {});
 return <form action={action} className="modal-delete-form">
  <input type="hidden" name="id" value={professional.id}/>
  <div className="delete-professional-summary"><span><Trash2 size={23}/></span><div><strong>{professional.name}</strong><small>Exclusão permanente do cadastro</small></div></div>
  <p>A exclusão também remove os vínculos de serviços, o expediente e os bloqueios deste profissional.</p>
  <div className="modal-history-note"><ShieldCheck size={18}/><p>Profissionais com agendamentos registrados não podem ser excluídos. Nesse caso, use a edição para desativá-los.</p></div>
  {state.error && <p className="error" role="alert">{state.error}</p>}
  <label className="checkbox"><input type="checkbox" name="confirm" value="yes" required disabled={pending}/>Confirmo a exclusão de {professional.name}.</label>
  <div className="admin-modal-footer"><button type="button" className="modal-secondary" onClick={onClose} disabled={pending}>Voltar</button>{state.error && <button type="button" className="modal-secondary" onClick={onEdit} disabled={pending}><Pencil size={14}/>Editar profissional</button>}<button type="submit" className="modal-danger-button" disabled={pending}>{pending ? 'Excluindo…' : 'Excluir profissional'}</button></div>
 </form>;
}

export function ProfessionalTable({ professionals, services, links }: { professionals: Professional[]; services: Service[]; links: Link[] }) {
 const [selection, setSelection] = useState<{ id: string; mode: Mode } | null>(null);
 const professional = professionals.find(item => item.id === selection?.id);
 const assigned = links.filter(link => link.professional_id === professional?.id);
 const close = () => setSelection(null);
 const open = (id: string, mode: Mode) => setSelection({ id, mode });
 return <><div className="professionals-table-wrap"><table className="professionals-table professionals-with-modal">
  <caption className="sr-only">Profissionais, serviços, status e ações</caption>
  <thead><tr><th scope="col">Nome do profissional</th><th scope="col">Serviços</th><th scope="col">Status</th><th scope="col">Ações</th></tr></thead>
  <tbody>{professionals.map(item => {
   const assigned = links.filter(link => link.professional_id === item.id);
   return <tr className="professional-row" key={item.id}>
    <th scope="row"><div className="professional-identity"><span className="record-avatar"><UserRound size={19}/></span><div><strong>{item.name}</strong><small>{assigned.length} serviço(s) vinculado(s)</small></div></div></th>
    <td><div className="professional-service-tags">{assigned.length ? assigned.map(link => { const service = services.find(service => service.id === link.service_id); return <span key={link.service_id} className={service?.active ? '' : 'inactive-service'}><Scissors size={11}/>{service?.name ?? 'Serviço não encontrado'}{service && !service.active && <small>Inativo</small>}</span>; }) : <span className="professional-no-service">Nenhum serviço vinculado</span>}</div></td>
    <td><span className={`professional-status ${item.active ? 'active' : 'inactive'}`}><i/>{item.active ? 'Ativo' : 'Inativo'}</span></td>
    <td><div className="professional-row-actions">{[{ mode: 'view' as const, label: 'Visualizar', icon: Eye }, { mode: 'edit' as const, label: 'Editar', icon: Pencil }, { mode: 'delete' as const, label: 'Excluir', icon: Trash2 }].map(({ mode, label, icon: Icon }) => <button type="button" key={mode} className={`professional-view-button ${mode === 'delete' ? 'delete-action' : ''}`} onClick={() => open(item.id, mode)} aria-label={`${label} ${item.name}`} aria-haspopup="dialog" title={label}><Icon size={16}/></button>)}</div></td>
   </tr>;
  })}</tbody>
 </table></div>
 {professional && selection && <AdminModal key={`${professional.id}:${selection.mode}`} title={selection.mode === 'view' ? 'Informações do profissional' : selection.mode === 'edit' ? 'Editar profissional' : 'Excluir profissional'} description={selection.mode === 'delete' ? 'Confira os dados antes de confirmar.' : 'Nome, serviços e situação do cadastro.'} onClose={close} danger={selection.mode === 'delete'}>
  {selection.mode === 'view' && <><div className="modal-professional-identity"><span className="record-avatar"><UserRound size={25}/></span><div><h3>{professional.name}</h3><span className={`professional-status ${professional.active ? 'active' : 'inactive'}`}><i/>{professional.active ? 'Ativo para agendamentos' : 'Profissional inativo'}</span></div></div><div className="modal-info-section"><h3>Serviços realizados</h3><ul className="modal-service-list">{assigned.map(link => { const service = services.find(service => service.id === link.service_id); return <li key={link.service_id}><Scissors size={16}/><span>{service?.name ?? 'Serviço não encontrado'}</span><small>{service?.active ? 'Ativo' : 'Inativo'}</small></li>; })}</ul>{!assigned.length && <p className="muted">Nenhum serviço vinculado a este profissional.</p>}</div><div className="admin-modal-footer"><button type="button" className="modal-secondary" onClick={close}>Fechar</button><button type="button" className="button small" onClick={() => open(professional.id, 'edit')}><Pencil size={14}/>Editar profissional</button></div></>}
  {selection.mode === 'edit' && <EditProfessional professional={professional} services={services} links={links}/>}
  {selection.mode === 'delete' && <DeleteProfessional professional={professional} onClose={close} onEdit={() => open(professional.id, 'edit')}/>}
 </AdminModal>}
 </>;
}
