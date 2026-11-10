# NEXORA — Plano de construção

Mensageiro em tempo real com identidade própria. Este documento é a fonte da verdade para
arquitetura, esquema de dados, fases e riscos. Tudo que não couber em uma fase é registrado
aqui (seção 9), nunca como `TODO` no código.

Situação: **Fase 0 concluída, aguardando aprovação do dono do produto.**

---

## 1. Stack e versões

Versões conferidas no registro npm em 10/11/2026.

| Área | Escolha | Versão | Observação |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.4.x | Node >= 20.9 (usamos Node 22) |
| UI | React | 19.3.x | |
| Linguagem | TypeScript `strict` | **6.0.x** | Ver ajuste 1 abaixo |
| Estilo | Tailwind CSS | 4.3.x | Tokens em um único arquivo CSS (`@theme`) |
| Componentes | shadcn/ui sobre Radix (`radix-ui`) | 1.8.x | Código dos componentes fica no repositório |
| Ícones | lucide-react | 1.x | Ícones próprios do conjunto, nada do WhatsApp |
| Backend | Supabase (`supabase-js`, `@supabase/ssr`) | 2.119 / 0.12 | Auth, Postgres, Realtime, Storage, Edge Functions |
| CLI de banco | `supabase` | 3.1.x | Migrations, tipos gerados, ambiente local |
| Dados do servidor | TanStack Query | 5.107.x | |
| Lista virtual | TanStack Virtual | 3.14.x | |
| Estado local | Zustand | 5.1.x | |
| Validação | Zod | 4.6.x | |
| Banco local | Dexie (IndexedDB) | 4.4.x | Cache e fila de envio |
| Push | `web-push` (VAPID) | 4.0.x | Dentro da Edge Function |
| Testes | Vitest / Playwright | 5.1 / 1.65 | |
| Lint | ESLint (flat config) + typescript-eslint + Prettier | 10.x | |
| Outros | react-easy-crop, browser-image-compression, qrcode | — | Recorte, compressão, QR |

### Ajustes propostos em relação ao pedido

1. **TypeScript 6.0 em vez de 7.0.** A versão 7 é a mais recente, mas o `typescript-eslint`
   ainda só aceita `< 6.1`. Usar a 7 significaria ficar sem lint de tipos. Subimos para a 7
   quando o lint suportar (item registrado na seção 9).
2. **Service worker próprio, sem plugin.** O guia oficial de PWA do Next.js recomenda um
   service worker escrito à mão. Ele fica em TypeScript (`src/sw/`) e é compilado com esbuild
   para `public/sw.js`. Evita depender de plugin atrelado ao empacotador.
3. **Mensagens em tempo real por Broadcast disparado pelo banco** (e não por Postgres
   Changes). A documentação do Supabase recomenda Broadcast para volume, porque o Postgres
   Changes verifica a permissão de cada mudança para cada assinante. Os três recursos pedidos
   continuam em uso: Broadcast (mensagens, tiques, reações, digitando, sinalização de
   chamada), Presence (online) e Postgres Changes (tabelas pequenas do próprio usuário:
   configurações, contatos e participação em conversas).
4. **Textos em dicionário tipado próprio** (`src/i18n/pt-BR.ts`), sem biblioteca de
   tradução por enquanto. Todos os textos ficam centralizados e a troca por `next-intl` no
   futuro é mecânica.
5. **Tabelas além do ponto de partida** (detalhes na seção 3): `message_deletions`,
   `message_mentions`, `user_presence`, `link_previews`, `rate_limits`, `status_audience`,
   `group_join_requests`, `conversation_preferences` (dentro de `conversation_members`).

---

## 2. Arquitetura

### 2.1 Visão geral

```
Navegador / PWA
 ├─ Next.js (App Router)  ── Server Components só para casca, sessão e metadados
 ├─ TanStack Query        ── cache em memória dos dados do servidor
 ├─ Dexie (IndexedDB)     ── espelho persistente + fila de envio (outbox)
 ├─ Zustand               ── estado de tela (seleção, rascunhos, player, chamada)
 ├─ Service worker        ── casca offline, Web Push, clique na notificação
 └─ WebRTC                ── mídia das chamadas, ponto a ponto

Supabase
 ├─ Auth                  ── e-mail + código de 6 dígitos
 ├─ Postgres + RLS        ── toda regra de acesso mora aqui
 ├─ Realtime              ── canais privados com autorização por RLS
 ├─ Storage               ── buckets privados, URLs assinadas
 ├─ Edge Functions        ── prévia de link, push, exportar/excluir conta, TURN, limpeza
 └─ pg_cron + pg_net      ── expiração de mensagens, status e arquivos
```

Princípio: **o cliente nunca é confiável**. Toda permissão é decidida no banco (RLS e
funções `security definer` com `search_path` fixo). A tela apenas reflete.

### 2.2 Estrutura de pastas

```
src/
  app/
    (auth)/            boas-vindas, login, código, criação de perfil
    (app)/             casca autenticada: conversas, atualizacoes, chamadas, configuracoes
    convite/[codigo]/  convite pessoal e de grupo
    manifest.ts
  components/ui/       shadcn/Radix
  features/            auth, perfil, contatos, conversas, mensagens, midia, grupos,
                       status, chamadas, notificacoes, configuracoes, busca
    <feature>/         components/ hooks/ api.ts schemas.ts store.ts
  lib/
    supabase/          clientes (browser, server, middleware) e tipos gerados
    realtime/          gerenciador único de canais
    db-local/          Dexie: esquema, outbox, sincronização
    formatacao/        parser de *negrito*, datas relativas, tamanhos
    env.ts             variáveis de ambiente validadas com Zod
  i18n/pt-BR.ts
  styles/tokens.css    ÚNICO arquivo de tokens (cores, raios, espaços, fontes, tempos)
  sw/                  service worker
supabase/
  migrations/          SQL versionado
  functions/           Edge Functions (Deno)
  seed.sql             3 usuários de teste + 1 grupo
  tests/               testes de RLS em SQL
e2e/                   Playwright (dois usuários simultâneos)
```

### 2.3 Tempo real

Um **gerenciador único de canais** (`lib/realtime`) cuida de assinatura, reconexão e
limpeza. Todos os canais são privados; a autorização é feita por políticas em
`realtime.messages`.

| Canal | Quem assina | Conteúdo | Origem |
|---|---|---|---|
| `user:{id}` | só o próprio usuário | mensagem nova/editada/apagada, tiques, reações, mudança em conversa, chamada recebida | gatilho no banco (`realtime.send`) |
| `conversation:{id}` | participantes | "digitando...", "gravando áudio..." | cliente (efêmero, nada gravado) |
| `presence:{id}` | quem tem permissão de ver o "online" daquele usuário | Presence | cliente |
| `call:{id}` | participantes da chamada | oferta, resposta, candidatos ICE, desligar | cliente |

- Um único canal `user:{id}` recebe os eventos de **todas** as conversas da pessoa. Isso
  evita abrir um canal por conversa e mantém a lista viva.
- Os canais `conversation:{id}` ficam abertos para a conversa em foco e para as 50 mais
  recentes da lista (para o "digitando..." na prévia).
- "Online" vem do Presence. "Visto por último" vem de `user_presence.last_seen_at`,
  atualizado ao sair, ao ocultar a aba e por batimento a cada 60 s.
- **Reconexão sem duplicar:** cada evento carrega o registro com `id` e `updated_at`. Ao
  reconectar, o cliente chama `sync_since(cursor)` e aplica tudo por `id` (upsert). Evento
  repetido ou fora de ordem não causa efeito.

### 2.4 Envio de mensagem (otimista + offline)

1. O cliente gera o `id` (UUID) da mensagem, grava no Dexie como `enviando`, mostra na tela.
2. A fila de envio manda para o banco pela função `send_message`. Como o `id` é a chave
   primária, reenviar a mesma mensagem não duplica (`on conflict do nothing`).
3. Sucesso → `enviada` (1 tique). Falha de rede → fica na fila com espera crescente e
   reenvia sozinha ao voltar a conexão. Erro definitivo (bloqueio de permissão, validação)
   → `falhou`, com botão de reenviar.
4. Anexos sobem antes (upload retomável, com progresso e cancelamento); a mensagem só é
   gravada quando o arquivo está no Storage.
5. O horário oficial é sempre o do servidor (`created_at`); a ordenação é por
   `(created_at, id)`.

### 2.5 Tiques

- `message_receipts (message_id, user_id, delivered_at, read_at)`.
- `mark_delivered()` é chamada quando o aparelho do destinatário recebe a mensagem (app
  aberto ou service worker ao receber o push). `mark_read(conversa, até_mensagem)` quando a
  conversa está visível.
- Um gatilho mantém em `messages` os campos `delivered_all_at` e `read_all_at`. O
  remetente recebe essa atualização pelo canal `user:{id}`. Em conversa direta, "todos" é a
  outra pessoa; em grupo, o tique duplo/lilás só aparece quando todos receberam/leram.
- Confirmação de leitura desligada: em conversas diretas, `read_at` não é gravado se
  qualquer um dos dois desligou (quem desliga também não vê a dos outros). Em grupos a
  leitura é sempre registrada, como padrão de mercado.
- Contador de não lidas e de menções fica em `conversation_members` (mantido por gatilho),
  para a lista não precisar contar mensagens a cada abertura.

### 2.6 Mídia

- Buckets privados: `avatars`, `media`, `status`, `wallpapers`. Caminho
  `media/{conversation_id}/{message_id}/{arquivo}`; a política do Storage confere a
  participação pela primeira parte do caminho.
- Compressão no aparelho: imagens redimensionadas (lado maior 1600 px, WebP/JPEG); vídeo
  com limite de tamanho e duração, miniatura extraída de um quadro. Miniatura borrada
  (imagem de ~24 px em base64) gravada junto com o anexo.
- Áudio: `MediaRecorder` (Opus em WebM; MP4/AAC no Safari), forma de onda calculada no
  aparelho e gravada no anexo.
- Visualização única: o destinatário não tem acesso direto ao arquivo. A função
  `open-view-once` registra a abertura, devolve uma URL assinada de 60 s e o arquivo é
  apagado em seguida.
- Limites (tamanho de documento, duração de vídeo, participantes) em uma tabela
  `app_config` lida pelo cliente e conferida no servidor.

### 2.7 Edge Functions

| Função | Para quê |
|---|---|
| `link-preview` | Busca título/descrição/imagem. Bloqueia endereços internos (SSRF), limita tamanho e tempo, guarda em `link_previews` |
| `send-push` | Chamada pelo banco a cada mensagem/chamada; respeita silenciadas, bloqueios e a opção de prévia |
| `open-view-once` | Entrega única de mídia |
| `turn-credentials` | Credenciais TURN de curta duração (o segredo nunca vai ao cliente) |
| `export-account` | Gera o arquivo com os dados da pessoa |
| `delete-account` | Apaga conta, dados e arquivos |
| `cleanup-expired` | Agendada: apaga arquivos de mensagens temporárias e status vencidos |

Todas validam a entrada com Zod, exigem sessão (exceto as chamadas pelo banco, que usam
segredo próprio) e passam pelo limitador de requisições (`rate_limits` no Postgres, janela
deslizante por usuário e função).

### 2.8 Chamadas

WebRTC ponto a ponto. A chamada nasce como linha em `calls` (o destinatário é avisado pelo
canal `user:{id}` e por push). A negociação (oferta, resposta, ICE) trafega pelo canal
`call:{id}`. STUN público por padrão; TURN por variável de ambiente, com credenciais
temporárias emitidas pela função `turn-credentials`. Sem resposta em 45 s → `perdida`.

### 2.9 Login

Supabase Auth com `signInWithOtp` + `verifyOtp` (código de 6 dígitos no e-mail). A camada
`features/auth` trabalha com um identificador `{ tipo: 'email' | 'telefone', valor }`, de
modo que ligar o SMS no futuro é ativar o provedor no Supabase e liberar o campo na tela.
Sessão em cookies via `@supabase/ssr`, renovada no middleware.

---

## 3. Esquema de dados

Convenções: chaves `uuid`; `created_at`/`updated_at` em `timestamptz`; nomes em inglês no
banco; RLS ligada em **todas** as tabelas; nenhuma política usa `using (true)`.

### Pessoas

| Tabela | Campos principais |
|---|---|
| `profiles` | `id` (= auth.users), `username` (único, sem diferenciar maiúsculas), `display_name`, `about`, `avatar_path`, `invite_code` |
| `user_settings` | privacidade (`last_seen`, `avatar`, `about`, `status`, `groups_add`: todos / contatos / ninguém), `read_receipts`, `default_disappearing`, notificações, tema, tamanho de fonte, `enter_sends`, download automático |
| `user_presence` | `user_id`, `last_seen_at` — separada para ter política própria de privacidade |
| `contacts` | `owner_id`, `contact_id`, `nickname` |
| `blocks` | `blocker_id`, `blocked_id` |
| `reports` | `reporter_id`, alvo (usuário, mensagem ou grupo), `reason`, `details` |
| `push_subscriptions` | `user_id`, `endpoint`, chaves, `user_agent`, `last_used_at` |

Os dados de perfil de **outras** pessoas são lidos por uma função (`get_profiles`) que
aplica a privacidade de foto, recado e visto por último; a tabela em si só é legível pelo
dono.

### Conversas e mensagens

| Tabela | Campos principais |
|---|---|
| `conversations` | `type` (direct / group), `direct_key` (par ordenado, único), dados do grupo (`name`, `description`, `avatar_path`), permissões (`send_policy`, `edit_policy`, `join_approval`), `disappearing_seconds`, `last_message_id`, `last_message_at` |
| `conversation_members` | `role` (admin / member), `muted_until`, `archived`, `pinned_at`, `favorite`, `marked_unread`, `last_read_at`, `unread_count`, `unread_mentions`, `cleared_at`, `wallpaper`, `left_at` |
| `messages` | `id` (gerado no cliente), `conversation_id`, `sender_id`, `type` (text, image, video, audio, document, location, contact, poll, system), `content`, `metadata` (jsonb), `reply_to_id`, `forwarded`, `edited_at`, `deleted_at`, `expires_at`, `view_once`, `hidden_from_recipient`, `delivered_all_at`, `read_all_at`, `search` (tsvector) |
| `message_attachments` | `message_id`, `path`, `mime`, `size`, `width`, `height`, `duration`, `blur_preview`, `waveform`, `file_name` |
| `message_receipts` | `message_id`, `user_id`, `delivered_at`, `read_at`, `played_at` (áudio ouvido), `viewed_at` (visualização única) |
| `message_reactions` | `message_id`, `user_id`, `emoji` (uma por pessoa) |
| `message_mentions` | `message_id`, `user_id` |
| `message_deletions` | `message_id`, `user_id` — "apagar para mim" |
| `starred_messages` | `user_id`, `message_id` |
| `pinned_messages` | `conversation_id`, `message_id`, `pinned_by`, `expires_at` |
| `polls` / `poll_options` / `poll_votes` | pergunta, opções, múltipla escolha, votos |
| `link_previews` | `url_hash`, `title`, `description`, `image_url`, `fetched_at` |

### Grupos, status e chamadas

| Tabela | Campos principais |
|---|---|
| `group_invites` | `conversation_id`, `code`, `revoked_at` |
| `group_join_requests` | `conversation_id`, `user_id`, `status` |
| `statuses` | `user_id`, `type` (text / image / video), `content`, `background`, `media_path`, `privacy`, `expires_at` |
| `status_audience` | lista de exceção ("exceto...") ou de inclusão ("somente...") |
| `status_views` | `status_id`, `viewer_id`, `viewed_at` |
| `calls` | `conversation_id`, `caller_id`, `kind` (voice / video), `started_at`, `answered_at`, `ended_at`, `end_reason` |
| `call_participants` | `call_id`, `user_id`, `state` (ringing, joined, declined, missed) |

### Apoio

`app_config` (limites configuráveis), `rate_limits` (limitador das Edge Functions).

### Índices principais

- `messages (conversation_id, created_at desc, id desc)` — histórico e paginação
- `messages (conversation_id, updated_at)` — sincronização ao reconectar
- `messages using gin (search)` — busca de conteúdo
- `messages (expires_at) where expires_at is not null` — limpeza
- `conversation_members (user_id, archived, pinned_at desc)` + `conversations (last_message_at desc)` — lista de conversas
- `conversation_members (conversation_id) where left_at is null` — checagem de participação (usada por toda a RLS)
- `message_receipts (message_id)`, `message_reactions (message_id)`
- `profiles (lower(username))` único; `profiles using gin (username gin_trgm_ops)` — busca
- `contacts (owner_id, contact_id)` único; `blocks (blocker_id, blocked_id)` único
- `statuses (user_id, expires_at)`; `calls (conversation_id, started_at desc)`

### Regras de segurança no banco

- Função `is_member(conversa)` (`security definer`, `stable`) usada pelas políticas; evita
  recursão de RLS e mantém as políticas curtas.
- Escritas sensíveis passam por funções: `send_message`, `edit_message` (15 min),
  `delete_message_for_all`, `mark_read`, `create_direct_conversation`, `create_group`,
  `add_members`, `set_role`, `join_by_invite`. O cliente não insere direto nessas tabelas.
- **Bloqueio:** quem foi bloqueado consegue enviar (vê 1 tique), mas a mensagem nasce com
  `hidden_from_recipient = true`: o bloqueador nunca a lê, não recebe push e não gera
  tique de entrega. Bloqueados não veem foto, recado, online, visto por último nem status,
  não podem ligar nem adicionar a grupos. Tudo decidido no banco.
- Storage: políticas por bucket conferindo participação (ou autoria) pelo caminho.
- Testes de RLS em SQL rodam a cada fase: um usuário de fora tenta ler e escrever em cada
  tabela e precisa falhar.

---

## 4. Offline e sincronização

- Dexie guarda: conversas, as últimas mensagens de cada conversa recente, perfis, rascunhos
  e a fila de envio (mensagens, reações, leituras pendentes).
- Ao abrir o app, a tela é montada a partir do Dexie e depois reconciliada com o servidor.
- `sync_since(cursor)` devolve tudo que mudou desde o último evento processado: mensagens
  novas, editadas, apagadas, tiques, reações e mudanças nas conversas.
- O service worker guarda a casca do app e os arquivos estáticos; dados nunca são servidos
  pelo cache do service worker (ficam no Dexie), para não mostrar conteúdo de outra sessão.
- Ao sair da conta, Dexie e caches são apagados.

---

## 5. Fases

Cada fase termina com: lint, tipos, testes, build, teste manual no navegador, commit e um
resumo com "o que foi feito / como testar / o que preciso de você". Só avanço com o OK.

| # | Fase | Entregas | Pronto quando |
|---|---|---|---|
| 0 | Planejamento | `PLAN.md`, `CLAUDE.md` | Aprovado |
| 1 | Fundação | Projeto, tokens, tema escuro/claro, casca responsiva (barra inferior / duas colunas), login por código, criação de perfil com recorte, esquema completo + RLS, seed, CI | Login real funciona; teste de RLS passa; perfil criado aparece no banco |
| 2 | Conversas diretas | Contatos (buscar, adicionar), lista de conversas, conversa, envio otimista, tiques, digitando, online/visto por último, não lidas, separadores de data, paginação + virtualização, rascunho | Dois usuários conversam em duas janelas; Playwright cobre envio, entrega e leitura |
| 3 | Ações de mensagem | Responder, reagir, editar, apagar (mim/todos), encaminhar, favoritar, fixar, copiar, selecionar várias, dados da mensagem, formatação, prévia de link, busca na conversa e global | Cada ação reflete em tempo real na outra janela |
| 4 | Mídia | Foto/vídeo com prévia, legenda e compressão; visualizador; visualização única; mensagem de voz completa; documentos; localização; contato; enquete; progresso com cancelar/tentar de novo; tela de mídia, links e documentos | Envio e recebimento de cada tipo entre dois usuários |
| 5 | Grupos | Criar, administrar, permissões, convite por link/QR, aprovação, menções, mensagens de sistema, cores por remetente, leitura por todos, sair/apagar | Grupo do seed funciona com 3 usuários |
| 6 | Organização e privacidade | Fixar, arquivar, silenciar, favoritar, não lida, limpar, apagar, filtros, arquivadas; todas as opções de privacidade; bloquear/denunciar; mensagens temporárias; papel de parede; apelido, convite pessoal | Privacidade e bloqueio comprovados por teste no banco |
| 7 | Atualizações | Publicar texto/foto/vídeo, anel, visualizador, quem viu, responder, privacidade, expiração com limpeza de arquivos | Status some sozinho em 24 h (testado com tempo reduzido) |
| 8 | PWA, push e offline | Manifest, service worker, instalação, Web Push, som e contador no título, fila offline, cache Dexie, sincronização | Notificação chega com o app fechado; mensagem escrita offline é enviada ao reconectar, sem duplicar |
| 9 | Chamadas | Voz e vídeo 1:1, tela de chamada recebida, controles, histórico | Chamada entre dois navegadores |
| 10 | Polimento e deploy | Acessibilidade (AA, teclado, leitor de tela), desempenho, suíte ponta a ponta completa, armazenamento, sessões ativas, exportar/excluir conta, trocar e-mail, deploy na Vercel, README | Critérios da seção "Pronto significa" atendidos em produção |
| 11 | Opcional: ponta a ponta | Ver seção 9 | — |

Observação: o esquema inteiro e a RLS entram na fase 1 para que a segurança seja testada
desde o início. As telas de cada funcionalidade chegam na sua fase.

---

## 6. Testes

- **Unitários (Vitest):** parser de formatação, datas relativas, ordenação da lista, fila
  de envio, reconciliação da sincronização, esquemas Zod.
- **Banco:** testes de RLS em SQL para cada tabela (usuário de fora não lê nem escreve),
  bloqueio, privacidade, janela de edição de 15 minutos.
- **Ponta a ponta (Playwright):** dois contextos de navegador simultâneos, cada um com um
  usuário do seed. Cenários: enviar → 1 tique → entregue → lida; digitando; presença;
  responder; reagir; editar; apagar para todos; mídia; grupo; offline e reenvio.
- Login nos testes: o Supabase local entrega os e-mails em uma caixa de teste (Mailpit); o
  teste lê o código de lá. Nenhum atalho de login existe no código do app.

---

## 7. Ambientes e o que vou precisar de você

Explico cada passo em detalhe quando chegar a hora. Resumo:

| Quando | O que | Por quê |
|---|---|---|
| Fase 1 | Criar uma conta e um projeto no **Supabase** (gratuito) e colar duas chaves nas configurações do ambiente | É o banco e o login do app |
| Fase 1 | Criar conta em um serviço de envio de e-mail (sugestão: **Resend**, gratuito) | O e-mail embutido do Supabase só permite pouquíssimos envios por hora; sem isso o código de login não chega de forma confiável |
| Fase 8 | Nada manual além de aceitar a permissão de notificação no navegador | As chaves VAPID eu gero; você só as cola como segredo |
| Fase 9 | Opcional: conta em um serviço **TURN** (ex.: Cloudflare Calls ou Metered) | Sem TURN, chamadas falham em algumas redes móveis e corporativas |
| Fase 10 | Criar conta na **Vercel** e conectar o repositório | Publicação |

Desenvolvimento e testes automáticos usam o Supabase local (via Docker). Você testa cada
fase no projeto Supabase hospedado.

---

## 8. Riscos

| Risco | Impacto | Como trato |
|---|---|---|
| Docker indisponível neste ambiente de nuvem (o programa está instalado, mas o serviço não está ativo) | Sem Supabase local não consigo rodar testes de banco e ponta a ponta aqui | Primeira tarefa da fase 1 é tentar ativá-lo. Se não for possível, uso um segundo projeto Supabase só para testes e aviso você |
| Limite de envio de e-mail do Supabase | Login falha | SMTP próprio (Resend) já na fase 1 |
| Web Push no iPhone | Só funciona com o app instalado na tela inicial (iOS 16.4+) | Tela de orientação para instalar; documentado no README |
| Gravação de áudio e vídeo varia entre navegadores (Safari usa MP4/AAC) | Áudio pode não tocar em outro aparelho | Detectar formato suportado ao gravar; testar reprodução cruzada na fase 4 |
| Compressão de vídeo no navegador é limitada | Vídeos grandes | Limite de tamanho/duração configurável; sem recodificação pesada no aparelho (seção 9) |
| WebRTC sem TURN | Chamadas falham atrás de certos roteadores | TURN por variável de ambiente; aviso claro na tela quando a conexão não fecha |
| Recibos por mensagem em grupos grandes (1 linha por pessoa por mensagem) | Crescimento do banco | Limite de participantes configurável (padrão 256); gravação em lote; índices; revisão na fase 10 |
| Limites do Realtime no plano gratuito (conexões e mensagens por segundo) | Atrasos com muitos usuários | Um canal por usuário em vez de um por conversa; "digitando" com intervalo mínimo de 3 s |
| Segundo plano no celular: o navegador suspende a conexão | Mensagens só chegam ao reabrir | Push acorda o service worker; sincronização ao voltar ao primeiro plano |
| Busca de conteúdo depende de o servidor ler as mensagens | Incompatível com criptografia de ponta a ponta | Na fase 11 a busca passa a ser local |
| `web-push` dentro do Deno (Edge Function) | Push não envia | Validar logo no início da fase 8; alternativa é enviar por uma rota do Next.js na Vercel |
| Leitura de sessões ativas depende de tabelas internas do Supabase Auth | Tela de sessões | Função restrita ao próprio usuário; validar na fase 10 |
| Escopo muito grande | Prazo | Fases fechadas, com critério de pronto; nada pela metade |

---

## 9. Fora das fases (evolução futura)

- **Chamadas em grupo:** exigem um servidor de mídia (SFU, por exemplo LiveKit). A malha
  ponto a ponto não escala além de 3–4 pessoas. O esquema `calls`/`call_participants` já
  comporta vários participantes.
- **Login por telefone/SMS:** estrutura pronta (seção 2.9); falta contratar provedor de SMS.
- **Criptografia de ponta a ponta (fase 11, opcional):** chaves por aparelho, protocolo no
  estilo Signal (X3DH + Double Ratchet) para conversas diretas e chaves de remetente para
  grupos; anexos cifrados no aparelho. Consequências: busca só local, prévia de link gerada
  no aparelho, push sem prévia de conteúdo vinda do servidor. **Até existir, nenhuma tela
  afirma que as mensagens são criptografadas de ponta a ponta.**
- **Recodificação de vídeo no aparelho** (ffmpeg.wasm): avaliar custo de bateria e tamanho.
- **TypeScript 7:** migrar quando o `typescript-eslint` suportar.
- **Outros idiomas:** adicionar dicionários ao lado de `pt-BR.ts`.
- **Painel de moderação** para tratar as denúncias gravadas em `reports` (por enquanto são
  consultadas direto no painel do Supabase).
