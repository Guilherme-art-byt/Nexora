# Lanterna — plataforma de filmes e séries

Plataforma de streaming com identidade própria (sala escura, luz de projetor), inspirada na usabilidade dos grandes serviços. Funciona de duas formas:

- **Modo demonstração** (padrão, sem configurar nada): catálogo de filmes e séries reais com pôsteres, fundos e miniaturas de episódios oficiais (TMDB); contas, perfis, lista e progresso salvos no navegador.
- **Com TMDB** (só uma chave): as artes ilustrativas são trocadas automaticamente pelos pôsteres, fundos, trailers e miniaturas de episódios oficiais.
- **Modo produção**: Supabase (Auth + PostgreSQL + Storage) e TMDB.

## Catálogo

101 títulos reais: **76 filmes** (17 brasileiros, como *Ainda Estou Aqui*, *Cidade de Deus*, *Central do Brasil*, *O Pagador de Promessas*, *Que Horas Ela Volta?* e *Bacurau*; clássicos como *O Poderoso Chefão*, *Um Sonho de Liberdade* e *Pulp Fiction*; animações da Pixar e do Studio Ghibli; documentários como *Senna* e *Apollo 11*) e **25 séries** (de *Breaking Bad*, *Game of Thrones*, *The Last of Us*, *Round 6* e *Friends* a *Attack on Titan*, *Avatar: A Lenda de Aang* e *Band of Brothers*). Arquivos: `src/data/catalog.ts` e `src/data/catalog.more.ts`.

- **Reais:** título e título original, ano, direção/criação, elenco e personagens, duração, país, idiomas, principais prêmios, total de temporadas e os nomes oficiais dos episódios.
- **Sinopses:** escritas para a Lanterna (não copiadas de terceiros).
- **Aproximados:** notas (referência IMDb na data de montagem) e classificação indicativa; confirme no ClassInd antes de publicar.
- **Séries:** trazem a primeira temporada (ou os primeiros episódios dela) como amostra; a página indica o total real de temporadas e de episódios.
- **Imagens:** capas reais do TMDB. `src/data/covers.json` guarda só os endereços (pôster, fundo e miniaturas de episódios) dos 101 títulos, e o navegador carrega as imagens de `image.tmdb.org`, sem precisar de chave. Para atualizar ou incluir títulos novos: `TMDB_READ_TOKEN=eyJ... node scripts/fetch-covers.mjs` (opcional: `--only=id1,id2`). Título sem capa oficial usa a ilustração original de `src/assets/art`. As imagens são do TMDB e dos detentores dos direitos; cite o TMDB conforme os termos da API ao publicar.
- **Reprodução:** ter os metadados não dá direito de exibir as obras. O botão Assistir toca o vídeo de demonstração, e a página de detalhes avisa isso; cadastre fontes licenciadas no painel.

## 1. Executar

Requisitos: Node.js 18 ou superior.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # build de produção em dist/ (com assets separados)
npm run build:single   # um único index.html autocontido (para hospedar em qualquer lugar)
npm run preview        # serve o build de produção
```

**Conta de administração do modo demonstração:** `admin@lanterna.app`, senha `Lanterna@2026` (também aparece na tela de login).

## 2. Funcionalidades

| Área | O que tem |
|---|---|
| Início | Cabeçalho que fica opaco ao rolar, banner em carrossel automático (pausa ao passar o mouse e no botão), 17 fileiras: Continue assistindo, Recomendados, Em alta (ranking), Originais, Lançamentos, por gênero, Premiados |
| Cards | Prévia ampliada ao passar o mouse (assistir, lista, gostei, detalhes); toque abre os detalhes no celular |
| Detalhes | Fundo cinematográfico, pôster, sinopse, elenco, direção, país, idiomas, legendas, trailer, gostei/não gostei, compartilhar, semelhantes; séries com seletor de temporada, episódios com miniatura, duração, sinopse e marcador de assistido |
| Player | Play/pausa, volume, barra com pré-visualização de tempo, ±10 s, tela cheia (inclui iPhone), qualidade (auto/720p/360p), áudio, legendas WebVTT, velocidade, próximo episódio com contagem, retomada, controles que somem sozinhos, atalhos de teclado, toque duplo para ±10 s |
| Pesquisa | Tempo real, sugestões (títulos, pessoas, gêneros), sem diferenciar maiúsculas nem acentos, histórico com limpeza, estado vazio |
| Categorias | Tipo, gêneros (múltiplos), ano/década, nota mínima, ordenação (populares, recentes, nota, ano, A–Z); filtros lembrados |
| Minha Lista | Adicionar/remover com desfazer, filtros, ordenação, progresso nos cards, persistente |
| Usuários | Cadastro com validação e força da senha, login, recuperação de senha, conta, foto, até 5 perfis por conta (incluindo infantil), preferências por perfil, histórico |
| Recomendações | Por perfil: gêneros assistidos (ponderados), lista, avaliações, gêneros favoritos, popularidade e nota; sem histórico mostra populares e lançamentos |
| Admin | Dashboard (usuários, filmes, séries, visualizações, gráfico de 7 dias, mais acessados, atividade), CRUD de títulos, temporadas e episódios, envio de pôster e fundo, trailers, fontes de vídeo autorizadas, gestão de usuários (promover, desativar), importação do TMDB |
| Páginas | Início, Filmes, Séries, Lançamentos, Em alta, Categorias, Detalhes, Player, Minha Lista, Pesquisa, Conta, Perfis, Login, Cadastro, Recuperar senha, Configurações, Admin (4 seções + editor) e 404 |

Acessibilidade: navegação por teclado, foco visível, `aria` em controles, link "pular para o conteúdo", respeito a `prefers-reduced-motion` e opção de reduzir animações por perfil, áreas de toque de 44 px.

## 3. Tecnologias e decisões

React 18, TypeScript, Tailwind CSS 3, Framer Motion, Lucide, Supabase JS, Vite 5.

**Por que Vite em vez de Next.js:** a plataforma é uma SPA autenticada (sem páginas que precisem de renderização no servidor para SEO além da home), e o Vite permite gerar um único arquivo HTML autocontido, usado para a demonstração publicada. A lógica fica isolada em `services/`, então migrar para Next.js App Router exige apenas trocar o roteador (`src/lib/router.tsx`) por rotas de arquivo.

**Roteamento por hash** (`#filmes`, `#titulo-orbita-baixa`): funciona em qualquer hospedagem estática sem configurar reescrita de URL.

## 4. Estrutura

```
lanterna/
├── index.html
├── api/tmdb/[...path].js            proxy do TMDB para produção na Vercel
├── scripts/fetch-covers.mjs        busca as capas oficiais no TMDB (gera src/data/covers.json)
├── scripts/generate_art.py         gerador das ilustrações reserva do catálogo
├── supabase/
│   ├── schema.sql                   tabelas, RLS, gatilhos, função admin_save_title, bucket
│   └── functions/tmdb-proxy/        Edge Function que guarda a chave do TMDB
└── src/
    ├── main.tsx, App.tsx            providers e rotas
    ├── admin/Admin.tsx              painel (dashboard, títulos, editor, usuários, fontes)
    ├── assets/art, assets/media     artes e vídeo de demonstração gerados pelo projeto
    ├── components/                  HeroBanner, MovieCard, MovieCarousel, ContinueWatching,
    │   ├── layout/                  SearchBar, CategoryFilter, TitleGrid, Header, Footer,
    │   └── ui/                      MobileNav, ProfileMenu, Dropdown, skeletons, badges
    ├── data/                        catálogo demo, capas oficiais (covers.json) e artes reserva
    ├── hooks/                       useScrolled, useCanHover, useDebounced, ações de título
    ├── lib/                         roteador, armazenamento seguro, hash de senha, formatação
    ├── pages/                       todas as páginas
    ├── player/                      VideoPlayer, fontes autorizadas, leitor WebVTT
    ├── services/                    repositório (local e Supabase), TMDB, busca, recomendações
    ├── store/                       estado global (app) e feedback (toasts, confirmações)
    ├── styles/index.css             tokens de design e componentes base
    └── types/                       tipos de domínio
```

## 5. Variáveis de ambiente

Copie `.env.example` para `.env`:

| Variável | Onde | Para quê |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | frontend | chave pública "anon" (protegida pelas regras RLS) |
| `TMDB_API_KEY` ou `TMDB_READ_TOKEN` | **somente servidor** (proxy do Vite, função da Vercel ou segredo da Edge Function) | chave do TMDB, nunca no frontend |
| `VITE_TMDB_PROXY` | frontend | `true` para usar o proxy `/api/tmdb` (imagens oficiais automáticas) |
| `VITE_TMDB_ENABLED` | frontend | `true` para usar o TMDB pela Edge Function do Supabase |

Sem as variáveis do Supabase, o app roda em modo demonstração.

## 6. Configurar o Supabase

1. Crie um projeto em supabase.com.
2. Em **SQL Editor**, cole e execute `supabase/schema.sql` inteiro.
3. Em **Authentication → URL Configuration**, adicione a URL do site (ex.: `http://localhost:5173`) em *Site URL* e *Redirect URLs* (necessário para confirmação de e-mail e recuperação de senha).
4. Preencha `.env` com a URL e a chave anon (**Project Settings → API**) e reinicie `npm run dev`.
5. Cadastre-se pelo site e torne sua conta administradora no SQL Editor:
   ```sql
   update public.accounts set role = 'admin' where email = 'voce@exemplo.com';
   ```
6. No painel, em **Títulos**, use **Publicar catálogo demo** para começar com conteúdo, ou importe do TMDB.

As permissões são aplicadas no banco: catálogo com leitura pública e escrita só de administradores; lista, histórico e avaliações visíveis apenas ao dono do perfil; usuários comuns não conseguem alterar o próprio papel (gatilho `guard_account_update`).

## 7. Integração TMDB

### Jeito rápido (sem Supabase): imagens oficiais em 3 passos

1. Crie uma chave gratuita em themoviedb.org → Configurações → API.
2. No `.env`, preencha `TMDB_API_KEY=sua_chave` e `VITE_TMDB_PROXY=true`.
3. Rode `npm run dev` (ou `npm run build && npm run preview`).

O navegador chama `/api/tmdb/...` e o servidor do Vite acrescenta a chave, que nunca entra no bundle (variáveis sem o prefixo `VITE_` não são expostas). Na primeira carga o app busca cada título pelo nome original e ano, troca as artes e guarda o resultado em cache no navegador.

**Em produção na Vercel:** o arquivo `api/tmdb/[...path].js` faz o mesmo papel. Defina `TMDB_API_KEY` e `VITE_TMDB_PROXY=true` nas variáveis do projeto e publique. Em outra hospedagem, crie uma função equivalente que encaminhe `/api/tmdb/*` para `https://api.themoviedb.org/3/*` com a chave.

### Com Supabase

1. Crie uma chave em themoviedb.org → Configurações → API.
2. Instale a CLI do Supabase e vincule o projeto: `supabase link --project-ref SEU_REF`.
3. Grave a chave como segredo e publique a função:
   ```bash
   supabase secrets set TMDB_API_KEY=sua_chave_v3
   supabase functions deploy tmdb-proxy
   ```
4. Defina `VITE_TMDB_ENABLED=true` no `.env` e reinicie.
5. No painel, **Títulos → Importar do TMDB**: busque, importe, revise e associe uma fonte de vídeo.
6. Para gravar no banco os pôsteres oficiais do catálogo, use **Títulos → Buscar pôsteres oficiais**.

A função só aceita chamadas de administradores e só libera rotas de leitura de metadados. O rodapé passa a exibir a atribuição exigida pelo TMDB.

**Importante:** metadados e trailers do TMDB não dão direito de exibir filmes ou episódios completos. Cadastre em **Fontes de vídeo** apenas arquivos próprios ou streams licenciados.

## 8. Fontes de vídeo

- A fonte `demo` (vídeo gerado pelo projeto, 720p/360p, 2 trilhas, legendas PT/EN/ES) vem embutida.
- Novas fontes: **Admin → Fontes de vídeo**, com URL https de MP4 (720p e opcionalmente 360p), legenda WebVTT e descrição da licença.
- HLS (`.m3u8`) funciona nativamente no Safari/iOS. Para Chrome e Firefox, instale `hls.js` (`npm i hls.js`) e anexe-o ao `<video>` em `src/player/VideoPlayer.tsx` quando `source.kind === "hls"`.

## 9. O que depende de serviços externos

| Recurso | Sem configuração | Com configuração |
|---|---|---|
| Contas, perfis, lista, histórico | navegador (modo demo) | Supabase, sincronizado entre aparelhos |
| E-mail de recuperação de senha | código exibido na tela | e-mail enviado pelo Supabase Auth |
| Envio de imagens no admin | imagem reduzida salva no navegador | bucket `media` do Supabase Storage |
| Métricas do dashboard | visualizações deste navegador | todas as visualizações (tabela `view_events`) |
| Pôsteres, fundos, trailers e miniaturas oficiais | ilustrações originais | TMDB (troca automática) |
| Novos títulos reais | catálogo incluído (101 títulos) | importação do TMDB pelo painel |
| Fontes Google (Big Shoulders Display, Manrope) | fontes do sistema como reserva | carregadas da Google Fonts |

## 10. Limitações conhecidas

- A troca automática pelas imagens oficiais foi testada com respostas simuladas da API do TMDB (o ambiente de desenvolvimento não acessa o TMDB). A integração com o Supabase foi escrita e tipada, e o SQL validado pelo parser do PostgreSQL, mas não foi executada contra um projeto real. Teste após configurar.
- A versão em arquivo único (`build:single`) tem cerca de 8 MB, porque embute as 202 ilustrações e o vídeo; o build normal (`npm run build`) carrega as imagens sob demanda.
- O vídeo demo tem 28 segundos; o progresso é salvo em proporção, então os tempos restantes exibidos usam a duração nominal do título.
- Recomendações são calculadas no navegador; para catálogos grandes, mova o cálculo para uma função no banco usando a view `title_view_counts`.
