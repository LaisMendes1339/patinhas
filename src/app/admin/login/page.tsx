import Link from 'next/link';
import { CalendarDays, LockKeyhole, PawPrint, TrendingUp } from 'lucide-react';
import { login } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="admin-login">
    <section className="admin-login-intro">
      <Link href="/" className="brand"><PawPrint/> patinhas & cia</Link>
      <div><div className="eyebrow">ÁREA ADMINISTRATIVA</div><h1>Mais organização.<br/>Mais tempo para cuidar.</h1><p>Acompanhe cada visita e planeje os próximos passos do seu petshop.</p><ul><li><CalendarDays size={20}/> Agenda e equipe no mesmo lugar</li><li><TrendingUp size={20}/> Previsão de valores por período</li><li><LockKeyhole size={20}/> Acesso exclusivo para a equipe</li></ul></div>
      <Link href="/" className="text-link">← Voltar ao site</Link>
    </section>
    <section className="admin-login-form" aria-labelledby="login-title"><div className="admin-card"><span className="service-icon"><LockKeyhole/></span><div className="eyebrow">ESPAÇO DA EQUIPE</div><h2 id="login-title">Entre no seu painel</h2><p className="muted">Use o e-mail e a senha da sua conta autorizada.</p>
      {error && <p role="alert" className="error">{error === 'config' ? 'Não foi possível conectar. Confira a configuração e a conexão com o Supabase.' : error === 'role' ? 'Sua conta não possui autorização administrativa.' : 'Não foi possível entrar. Confira seu e-mail e senha.'}</p>}
      <form action={login}><label>E-mail<input name="email" type="email" autoComplete="username" required/></label><label>Senha<input name="password" type="password" minLength={8} autoComplete="current-password" required/></label><button className="button">Entrar no painel</button></form><p className="muted login-help">O acesso é liberado pelo responsável do petshop.</p>
    </div></section>
  </main>;
}
