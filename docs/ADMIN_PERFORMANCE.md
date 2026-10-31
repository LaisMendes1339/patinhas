# Análise de desempenho do administrativo

## Evidências e limites

O fluxo original de `/admin` iniciava nove grupos de consultas antes de renderizar qualquer tela: reservas, serviços, profissionais, clientes, pets, expediente, bloqueios, regras e vínculos. A paginação podia gerar mais requisições dentro de cada grupo.

A consulta de profissionais executada no Supabase, com papel `authenticated` e autorização do responsável, retornou quatro registros em **8,303 ms** (`EXPLAIN ANALYZE`, uma amostra). As estatísticas do banco indicavam aproximadamente duas reservas e quatro profissionais. Esse volume e essa consulta isolada não explicam segundos de demora; os dados sustentam priorizar o excesso de requisições, as dependências entre chamadas de autenticação e a navegação que aguardava todos os dados.

O acesso HTTPS a `patinhascia.vercel.app` foi bloqueado no ambiente de execução (`EACCES`). Portanto, não há medição de antes/depois do tempo total da Vercel, nem comprovação de uma porcentagem de aceleração. A localização da função da Vercel, sua distância ao Supabase e inicializações a frio continuam como itens para conferir na hospedagem, não como causas confirmadas.

## Alterações

| Tela | Grupos de consultas antes | Depois |
| --- | ---: | ---: |
| Visão geral | 9 | 3 |
| Agenda | 9 | 3 |
| Cadastros | 9 | 5 |
| Disponibilidade, responsável | 9 | 4 |
| Disponibilidade, equipe | 9 | 3 |

Essa contagem exclui as verificações de autenticação/autorização e assume até 499 registros por consulta paginada. Os lotes seguintes continuam sendo lidos quando necessários: não foram descartadas reservas ou linhas para reduzir a contagem.

- O dashboard consulta somente datas, valores, situação e nomes dos serviços/profissionais das reservas. Não carrega os relacionamentos pessoais de clientes e pets.
- As consultas de cada tela iniciam em paralelo. Clientes e pets são carregados apenas em Cadastros; expediente e bloqueios, apenas em Disponibilidade.
- O cabeçalho e o menu não aguardam as consultas de conteúdo. Um limite de Suspense com chave por tela/período/filtros transmite o conteúdo quando pronto, com skeleton durante a espera.
- O menu informa o clique pendente, e `loading.tsx` fornece um estado de carregamento para a rota dinâmica.
- Os gráficos, calendário e editor de cadastros têm bundles de navegador separados, com renderização no servidor preservada.
- `requireAdmin()` e o cliente autenticado são deduplicados apenas dentro da mesma requisição via `React.cache`. A autenticação e a situação ativa continuam sendo verificadas em cada nova requisição. Não existe cache global de dados pessoais ou permissões.
- O proxy usa `getClaims()` para verificar/renovar o token. Projetos com chaves assimétricas podem validar a assinatura com JWKS em cache. Com chaves simétricas, o SDK ainda consulta o Auth. A página mantém `getUser()` e a leitura atual de `admin_users`, preservando a verificação de usuário e papel.
- As requisições autenticadas ao Supabase têm timeout de oito segundos.
- Contas da equipe não repete a mesma verificação de administrador dentro da mesma renderização. A Edge Function consulta os detalhes de até oito contas em paralelo, em vez de uma por vez. Essa função foi republicada no Supabase.

## Validação e observação na Vercel

Os testes verificam quais tabelas cada tela acessa, filtros de datas/serviço/profissional, ausência de joins pessoais no dashboard, continuação da paginação após 500 registros e tratamento de falhas. O teste de contas verifica ordem e limite de oito solicitações simultâneas.

Para medir consultas reais, configure temporariamente `ADMIN_PERF_LOGS=true` na hospedagem e publique novamente. O log `[admin:data]` contém somente `section`, `queries`, `ms` e `failed`. O tempo inclui as consultas de conteúdo; exclui autenticação, carregamento de JavaScript e transporte navegador–Vercel.

No navegador, use Network para comparar uma primeira visita e visitas repetidas entre Visão geral, Agenda, Cadastros e Disponibilidade. Observe as respostas RSC e o tamanho dos arquivos JavaScript. Não compare o modo `next dev` com produção: em desenvolvimento há compilação sob demanda.

Não houve migration de banco para essas otimizações. A atualização do front-end e servidor depende de commit/push e nova publicação da Vercel.

Referências consultadas: guias locais da versão instalada de Next.js sobre prefetch, Suspense/loading e lazy loading; [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims) e [autenticação SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
