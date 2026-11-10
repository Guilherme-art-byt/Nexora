# NEXORA — guia de trabalho

Mensageiro em tempo real (Next.js + Supabase). O plano completo está em `PLAN.md`; leia-o
antes de qualquer tarefa. Este arquivo guarda comandos, convenções e decisões.

**Fase atual:** 1 (fundação) concluída — aguardando o OK do dono do produto para a fase 2.

## Como trabalhamos

- Uma fase por vez, na ordem do `PLAN.md`. Ao fim de cada fase: lint, tipos, testes, build,
  teste manual no navegador, commit, e resumo (o que foi feito / como testar / o que preciso
  de você). Só avançar com OK.
- O dono do produto não é programador: qualquer passo manual é explicado em português
  simples, passo a passo, e espera confirmação.
- Proibido no código: `TODO`, dados fictícios, botões sem função, telas "em breve". O que
  não couber na fase vai para a seção 9 do `PLAN.md`.
- Dúvida que bloqueia → perguntar. Dúvida que não bloqueia → decidir, registrar em
  "Decisões" abaixo e seguir.
- Erro que se repete → investigar a causa, não contornar.
- Não usar nome, logotipo, ícones, sons ou imagens do WhatsApp.
- A interface não pode afirmar criptografia de ponta a ponta enquanto a fase 11 não existir.

## Comandos

Primeira vez: `npm ci`, `npm run db:start`, `npm run db:env`, `npm run db:reset`.
Neste ambiente de nuvem o Docker precisa ser ligado antes: `dockerd > /tmp/dockerd.log 2>&1 &`.

| Comando | O que faz |
|---|---|
| `npm run dev` | App em desenvolvimento |
| `npm run build` | Build de produção (inclui o service worker) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (usar `-- --trace off`, salvo ao depurar) |
| `npm run test:db` | Testes de RLS em SQL |
| `npm run db:start` / `db:stop` | Supabase local (Docker) |
| `npm run db:reset` | Recria o banco local: migrations + seed |
| `npm run db:seed` | Cria os 3 usuários de teste e o grupo (pode repetir) |
| `npm run db:env` | Gera o `.env.local` apontando para o Supabase local |
| `npm run format` | Prettier em tudo |
| `npm run db:types` | Gera `src/lib/supabase/database.types.ts` |
| `npm run check` | lint + typecheck + test + build |

## Convenções

### Código
- TypeScript `strict`, sem `any` e sem `as` para calar erro. Tipos do banco são gerados,
  nunca escritos à mão.
- Organização por funcionalidade em `src/features/<nome>/` (`components/`, `hooks/`,
  `api.ts`, `schemas.ts`, `store.ts`). Código compartilhado em `src/lib/`.
- Server Components só para casca, sessão e metadados. Tudo que é tempo real é Client
  Component.
- Dados do servidor: TanStack Query. Estado de tela: Zustand. Não duplicar dado do servidor
  no Zustand.
- Toda entrada externa (formulário, resposta de Edge Function, payload de Realtime,
  variável de ambiente) passa por um esquema Zod.
- Todo texto visível vem de `src/i18n/pt-BR.ts`. Nenhuma string de interface solta em
  componente.
- Todo valor visual (cor, raio, espaço, fonte, duração) vem de `src/styles/tokens.css`.
  Nenhum hexadecimal em componente.
- Animações de 150–200 ms, desligadas com `prefers-reduced-motion`.
- Acessibilidade: contraste AA, foco visível, `aria-label` em botão só com ícone,
  navegação por teclado.
- Nomes de código, tabelas e colunas em inglês; rotas e textos de interface em português;
  comentários só quando explicam um porquê.

### Banco
- Toda mudança em migration nova em `supabase/migrations/` (nunca editar migration já
  aplicada).
- RLS ligada em toda tabela, com teste em `supabase/tests/database/` (pgTAP).
- Depois de mudar o esquema: `npm run db:types` (o CI falha se os tipos estiverem desatualizados).
- Funções internas no esquema `private`; só o que o cliente chama fica em `public`.
- Funções `security definer` sempre com `set search_path = ''` e nomes qualificados.
- Escritas com regra de negócio passam por função SQL (RPC), não por insert direto.
- Buckets sempre privados; acesso por URL assinada.

### Tempo real
- Somente `src/lib/realtime` cria e fecha canais. Componentes usam hooks.
- Todo evento é aplicado por `id` (upsert): repetido ou fora de ordem não pode causar efeito.

### Git
- Commits pequenos, em português, no imperativo ("Adiciona login por código").
- Nenhum segredo no repositório. `.env.example` sempre atualizado.

## Identidade visual (resumo)

Fundo `#0A0A0F` · superfícies `#14141C` e `#1C1C28` · bordas `#2A2A3A` · primário `#8B5CF6`
· roxo profundo `#6D28D9` · lilás `#C4B5FD` · texto `#F4F4F8` · texto secundário `#9A9AB0`
· erro `#F87171`. Balão enviado em roxo profundo, recebido em `#1C1C28`, tique de leitura
lilás. Tema escuro padrão, claro opcional. Mobile first.

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| 1 | TypeScript 6.0.x, não 7 | `typescript-eslint` só aceita `< 6.1` |
| 2 | Service worker próprio compilado com esbuild | Recomendação do guia de PWA do Next.js; sem dependência de plugin |
| 3 | Mensagens por Broadcast disparado pelo banco em um canal privado por usuário | Recomendação do Supabase para volume; lista inteira viva com um só canal |
| 4 | Postgres Changes só em tabelas pequenas do próprio usuário | Custo de verificação de permissão por assinante |
| 5 | `id` da mensagem gerado no cliente e usado como chave primária | Reenvio da fila offline nunca duplica |
| 6 | Ordenação por `(created_at, id)` com horário do servidor | Relógio do aparelho não é confiável |
| 7 | Tiques: `message_receipts` + campos agregados em `messages` | Detalhe por pessoa e leitura barata do estado na lista |
| 8 | Contadores de não lidas em `conversation_members` (gatilho) | Lista de conversas sem contagem a cada abertura |
| 9 | Perfil de terceiros lido por função que aplica privacidade | RLS é por linha, não por coluna |
| 10 | Bloqueado envia, mas a mensagem fica oculta para quem bloqueou | Mesmo comportamento esperado de um mensageiro; decidido no banco |
| 11 | Dexie para cache local e fila de envio | API tipada e migrações de esquema no IndexedDB |
| 12 | Dicionário tipado próprio para textos | Centraliza sem acrescentar rotas por idioma agora |
| 13 | Limitador de requisições em tabela no Postgres | Dispensa serviço externo |
| 14 | Limites (tamanho de arquivo, participantes) em `app_config` | Configurável sem novo deploy |
| 15 | Esquema completo e RLS já na fase 1 | Segurança testada desde o início |
| 16 | Estado pessoal da conversa em `conversation_states`, separado de `conversation_members` | Silenciar, arquivar e não lidas não podem ser vistos pelos outros participantes |
| 17 | Sessão lida no navegador; `src/proxy.ts` só renova cookies e redireciona | Com Cache Components as páginas ficam estáticas; a proteção real é a RLS |
| 18 | Next.js 16: ler `node_modules/next/dist/docs/` antes de usar API nova (middleware agora é `proxy.ts`) | Há mudanças em relação a versões anteriores |
| 19 | Componentes no estilo shadcn escritos à mão sobre `radix-ui`, usando só os nossos tokens | O gerador do shadcn traria nomes de tokens próprios |
| 20 | Seed em `scripts/seed.mjs` (API de administração), não em `seed.sql` | O mesmo script serve ao banco local e ao hospedado (`SEED_EMAILS`) |
| 21 | Migrations chegam ao Supabase hospedado pelo workflow `.github/workflows/banco.yml` | O dono do produto não roda comandos; segredos ficam no GitHub |
| 22 | Sem acesso anônimo: `anon` não tem privilégio em tabela nem função; `authenticated` sem TRUNCATE | Menor superfície de ataque |
| 23 | Botões preenchidos usam o roxo profundo `#6D28D9`; `#8B5CF6` fica para foco e destaques | Texto branco sobre `#8B5CF6` não atinge contraste AA |
| 24 | Testes de banco não dependem do seed nem de dados de outros testes | Rodam em qualquer ordem |
