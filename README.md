# Patinhas & Cia

Landing page, agendamento e painel administrativo no mesmo projeto Next.js, com TypeScript, Tailwind CSS e Supabase.

## Executar localmente

Use Node.js 22.18 ou superior.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
# Preencha as variaveis do Supabase em .env.local.
npm.cmd run dev
```

Se `.env.local` ja existir, preserve o arquivo. Nunca envie credenciais ao GitHub.

## Producao: landing page e administrativo

Importe este repositorio em uma hospedagem com suporte a Next.js e servidor Node.js. As duas partes rodam na mesma aplicacao: `/` e `/admin`. GitHub Pages nao executa as APIs, autenticacao e server actions usadas aqui.

- Instalacao: `npm ci`.
- Build: `npm run build`.
- Inicializacao em servidor Node.js: `npm start`.
- Diretorio raiz: a raiz deste repositorio.

Configure as variaveis na hospedagem antes de compilar:

| Variavel | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publica anon do mesmo projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional; chave privilegiada, somente no servidor |
| `TEST_DATABASE_URL` | Apenas testes em banco descartavel; dispensavel em producao |

Mudancas em variaveis `NEXT_PUBLIC_` exigem novo build. Nunca use esse prefixo para chaves privilegiadas.

Sem `SUPABASE_SERVICE_ROLE_KEY`, publique a Edge Function `booking-api` de `supabase/functions` no mesmo projeto Supabase. Ela usa as credenciais injetadas pelo Supabase. Com a chave configurada no servidor Next.js, as operacoes usam diretamente o banco.

Use HTTPS. Configure a Site URL e as URLs de redirecionamento permitidas na autenticacao do Supabase para o dominio publicado.

## Banco e acesso ao painel

Para um banco novo, revise e aplique nesta ordem:

1. `supabase/migrations/202610310001_initial.sql`.
2. `supabase/migrations/202610310002_restrict_admin_check.sql`.
3. Opcionalmente, `supabase/seed.sql`, com catalogo e profissionais ficticios.

Nao reaplique a migration inicial ou o seed em um banco ja configurado. A aplicacao nao executa migrations ao iniciar. Nenhum banco ou cadastro de clientes e incluido neste repositorio.

Crie a conta da equipe em Supabase > Authentication > Users. Autorize o UUID criado no SQL Editor:

```sql
insert into public.admin_users (user_id, role)
values ('UUID-DO-USUARIO', 'owner');
```

Entre em `/admin/login` com essa conta. Use `staff` para colaboradores com permissoes reduzidas. Nao existe cadastro publico de administradores nem senha padrao.

Detalhes de tabelas, RLS e concorrencia: [docs/DATABASE_REVIEW.md](docs/DATABASE_REVIEW.md).

## Rotas

- `/`: landing page e catalogo.
- `/agendar`: criacao de reserva.
- `/gerenciar`: cancelamento e reagendamento com token privado.
- `/admin/login`: entrada da equipe.
- `/admin`: agenda, indicadores financeiros, cadastros e disponibilidade.

Revise contatos e depoimentos ficticios antes do lancamento. O financeiro apresenta valores das reservas, sem registrar pagamentos recebidos. Clientes e pets exibem ate 100 registros no painel. As fotos usam URLs externas do Unsplash.

## Verificacoes

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

`npm.cmd run check:supabase` verifica a conexao configurada. `npm.cmd run test:integration` exige `TEST_DATABASE_URL` de um banco de testes separado com migrations aplicadas; nunca use producao.

## Arquivos versionados

Codigo, configuracoes, lockfile, scripts, testes e SQL de estrutura/demonstracao. Credenciais, dependencias, caches, builds, logs e backups ficam fora do Git. Configure segredos diretamente na hospedagem.
