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

Revise contatos e depoimentos ficticios antes do lancamento. O financeiro apresenta valores das reservas, sem registrar pagamentos recebidos. As fotos usam URLs externas do Unsplash.

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

## Contas da equipe

A conta responsavel acessa **Contas da equipe** no menu do painel (`/admin/contas`). Permite criar contas com e-mail e senha, desativar, reativar e excluir acessos da equipe. A conta responsavel e protegida contra exclusao/desativacao.

Em novos ambientes aplique tambem `supabase/migrations/202610310003_admin_accounts.sql` e publique a Edge Function `admin-accounts` com verificacao JWT ativada. A funcao usa a chave privilegiada interna do Supabase; nao exige adiciona-la a Vercel. Somente responsaveis ativos podem executar operacoes. A desativacao revoga o acesso aos dados mesmo para sessoes existentes.

A conta inicial e criada diretamente no ambiente Supabase, sem senha no codigo, seed ou repositorio. Em outro banco, crie uma conta Auth pelo Dashboard e autorize como `owner` conforme as instrucoes acima.

## Painel visual e filtros

O painel abre no mes atual. Em **Visao geral**, os indicadores separam o valor dos servicos concluidos, a previsao das reservas confirmadas, o total de atendimentos ativos e o ticket medio. O grafico de evolucao permite consultar os valores de cada coluna. Os rankings de servicos e profissionais alternam entre quantidade de atendimentos e valores. Cancelamentos aparecem separadamente.

Os filtros de mes, dia, sete dias ou intervalo personalizado, profissional e servico se aplicam tanto aos graficos quanto a agenda. O intervalo personalizado aceita ate um ano. Os valores sao calculados pela data do atendimento e pelo preco gravado na reserva; nao representam caixa recebido nem lucro liquido.

A agenda possui busca por cliente, pet, e-mail ou referencia e filtro por situacao. Os cadastros ficam em abas de clientes, profissionais, servicos e pets, com busca, paginacao e edicao. Clientes e pets sao consultados em lotes para evitar o antigo limite de 100 registros. Os precos sao informados em reais e armazenados em centavos. Nao ha nova migration para esta reformulacao visual.

## Cadastro de profissionais

A aba Profissionais apresenta uma tabela com nome, servicos vinculados e status. O botao de olho abre as acoes para editar o nome, ativar/desativar o profissional e adicionar ou remover vinculos de servico. A busca considera nome e servicos.

Novos profissionais exigem nome e um servico ativo. A migration `supabase/migrations/202610310004_professional_service.sql` cria a funcao `create_professional_with_service`, que grava profissional e vinculo na mesma transacao, com as permissoes do administrador autenticado. Aplique esta migration em novos ambientes antes de usar o cadastro atualizado.

## Desempenho do administrativo

A analise e as otimizacoes estao em [docs/ADMIN_PERFORMANCE.md](docs/ADMIN_PERFORMANCE.md). Cada tela consulta apenas os dados necessarios; o menu e o cabecalho aparecem antes das consultas de conteudo. Para diagnostico na Vercel, ative temporariamente `ADMIN_PERF_LOGS=true` e publique novamente. Os logs incluem somente tela, numero de consultas, tempo e indicacao de falha, sem dados pessoais.
