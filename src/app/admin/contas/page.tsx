import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { accountOperation, type AdminAccount } from '@/lib/admin-accounts';
import { manageAccount } from './actions';

export const dynamic = 'force-dynamic';

export default async function Accounts({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
 const { role } = await requireAdmin();
 if (role !== 'owner') redirect('/admin');
 const params = await searchParams;
 let accounts: AdminAccount[] = [];
 let failed = false;
 try { accounts = (await accountOperation({ operation: 'list' })).accounts ?? []; } catch { failed = true; }
 return <main className="container section">
  <Link href="/admin" className="text-link">← Voltar ao painel</Link>
  <h1>Contas da equipe</h1>
  <p>Crie acessos individuais e controle quem pode entrar no painel.</p>
  {(failed || params.error) && <p role="alert" className="error">{failed ? 'Não foi possível carregar as contas. Confira a conexão e a publicação da função admin-accounts no Supabase.' : 'Não foi possível concluir. Verifique os dados, se o e-mail já está cadastrado e tente novamente.'}</p>}
  {params.saved && <p role="status" className="success-notice">Alteração concluída.</p>}
  <div className="admin-grid"><section className="admin-card"><h2>Nova conta</h2>
   <p className="muted">A equipe acessa a agenda e os cadastros. Apenas a conta responsável gerencia usuários e regras.</p>
   <form action={manageAccount}>
    <input type="hidden" name="operation" value="create"/>
    <label>E-mail<input type="email" name="email" maxLength={254} autoComplete="off" required/></label>
    <label>Senha inicial<input type="password" name="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
    <button className="button">Criar conta</button>
   </form>
  </section><section className="admin-card"><h2>Acessos cadastrados</h2>
   {accounts.map(account => <article key={account.user_id}>
    <h3>{account.email}</h3>
    <p>{account.role === 'owner' ? 'Responsável' : 'Equipe'} · {account.active ? 'Ativa' : 'Desativada'}</p>
    {account.role === 'owner' ? <p className="muted">Conta responsável protegida contra exclusão e desativação.</p> : <>
     <form action={manageAccount}><input type="hidden" name="id" value={account.user_id}/><button className="button small" name="operation" value={account.active ? 'deactivate' : 'activate'}>{account.active ? 'Desativar acesso' : 'Reativar acesso'}</button></form>
     <details><summary className="danger">Excluir conta</summary>
      <p>A exclusão é permanente. O histórico de atendimentos permanece.</p>
      <form action={manageAccount}><input type="hidden" name="id" value={account.user_id}/><input type="hidden" name="operation" value="delete"/><label className="checkbox"><input type="checkbox" name="confirm" value="yes" required/>Confirmo a exclusão desta conta</label><button className="text-link danger">Excluir definitivamente</button></form>
     </details>
    </>}
   </article>)}
   {!failed && !accounts.length && <p>Nenhuma conta cadastrada.</p>}
  </section></div>
 </main>;
}
