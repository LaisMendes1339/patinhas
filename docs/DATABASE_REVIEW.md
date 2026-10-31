# Banco Supabase — estrutura aplicada

O projeto Supabase configurado no ambiente local foi conectado e inspecionado. O schema público não continha tabelas nem migrations. A migration inicial, o seed e a restrição de acesso anônimo a `is_admin()` foram aplicados. As 11 tabelas têm RLS. O catálogo inicial contém dados fictícios; não havia dados existentes a migrar.

A Edge Function `booking-api` foi publicada com verificação JWT. Ela aceita apenas as quatro operações de disponibilidade, criação e gerenciamento, valida parâmetros e aplica limites antes de alterações. A chave privilegiada permanece no ambiente do Supabase. Acesso direto anônimo às funções privilegiadas e aos dados de clientes continua proibido. O código e os testes do gateway estão versionados em `supabase/functions/booking-api` e `tests/booking-gateway.test.mjs`.

O roteiro abaixo permanece como referência para novos ambientes; não reaplique a migration inicial neste projeto. Uma reserva real e testes concorrentes de banco ainda não foram executados nesta sessão. O teste não destrutivo `npm.cmd run check:supabase` verifica o acesso de rede e a Edge Function no terminal pessoal do responsável.

## Arquivos para revisão

- `supabase/migrations/202610310001_initial.sql`: estrutura e segurança.
- `supabase/seed.sql`: catálogo e profissionais fictícios iniciais.

## Objetos propostos

| Objeto | Finalidade |
| --- | --- |
| `customers`, `pets` | Responsáveis e pets, sem leitura pública |
| `services` | Preço em centavos e duração gerenciáveis |
| `professionals`, `professional_services` | Profissionais e suas competências |
| `working_hours` | Intervalos semanais separados por pausas |
| `availability_exceptions` | Feriados globais, folgas e bloqueios individuais |
| `appointments` | Reserva UTC, preço histórico, referência e token privado |
| `booking_settings` | Prazos de cancelamento/reagendamento e horizonte |
| `admin_users` | Papéis `owner` e `staff` vinculados a Supabase Auth |
| `request_limits` | Contadores persistentes de tentativas |

`btree_gist` permite a exclusion constraint `appointments_no_overlap` sobre profissional e `tstzrange(starts_at, ends_at, '[)')`. Reservas canceladas ficam fora da constraint; concluídas preservam a ocupação histórica.

`create_booking` cria cliente, pet e reserva na mesma transação. A trigger valida competência, atividade, duração, horizonte, expediente, pausas, exceções e reservas existentes. O fim e o preço são calculados no banco. Uma violação GiST ou perda de disponibilidade retorna HTTP 409 sem persistir cliente/pet da tentativa rejeitada. Intervalos adjacentes são permitidos.

`manage_booking` exige token aleatório e respeita os prazos configurados. O token é mostrado apenas na confirmação; o link o carrega no fragmento, sem enviá-lo na URL ao servidor. O usuário deve guardá-lo.

RLS permite consulta anônima somente ao catálogo ativo. Clientes e pets exigem papel administrativo. As funções públicas de reserva e disponibilidade só podem ser chamadas pelo servidor com `service_role`. Usuários sem papel não acessam dados administrativos. Configurações exigem `owner`, inclusive no banco.

## Antes da execução remota

1. Conectar o Supabase MCP e identificar explicitamente o projeto.
2. Inspecionar tabelas, funções, extensões e políticas existentes. Comparar nomes e dependências.
3. Ajustar a migration se houver conflitos; não substituir objetos existentes.
4. Revisar o SQL final e obter aprovação do usuário para a migration **e para o seed**, separadamente de qualquer migração de dados existentes.
5. Aplicar a migration aprovada, verificar políticas/constraints e carregar o seed aprovado.
6. Criar o usuário em Auth e autorizar seu UUID real em `admin_users` por operação administrativa aprovada. Nunca permitir autoatribuição de papéis.
7. Executar os testes em banco de teste separado. Só então validar o fluxo real na interface.

Não há DROP de tabelas, truncamento ou migração destrutiva de dados. O `DROP POLICY` da migration troca apenas a política criada anteriormente na própria transação para restringir configurações a `owner`.
