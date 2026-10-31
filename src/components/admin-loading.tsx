export function AdminContentLoading() {
 return <div className="admin-loading" role="status" aria-live="polite" aria-label="Carregando dados do painel">
  <span className="sr-only">Carregando dados do painel…</span>
  <div className="admin-loading-filter"/>
  <div className="admin-loading-stats">{[0, 1, 2, 3].map(key => <div key={key}/>)}</div>
  <div className="admin-loading-panels"><div/><div/></div>
 </div>;
}
