import type { Title } from "@/types";
import { EN, movie, series, type Ep } from "./titleBuilders";

/**
 * CLÁSSICOS EM DOMÍNIO PÚBLICO: obras completas que podem ser exibidas.
 *
 * Cada título aponta para uma fonte "pd-*" (src/player/publicDomain.ts), um arquivo do
 * Internet Archive. Critério: divulgados há mais de 70 anos (Lei 9.610/98, art. 44) e também
 * em domínio público nos EUA. Metadados reais; sinopses escritas para a Lanterna; notas
 * aproximadas (IMDb). Duração = duração do arquivo exibido (cópias de filmes mudos variam
 * conforme a velocidade de projeção).
 */
const MUDO = ["Filme mudo (intertítulos)"];

const pdMovies: Title[] = [
  movie({
    id: "nosferatu-1922", title: "Nosferatu: Uma Sinfonia de Horror", originalTitle: "Nosferatu, eine Symphonie des Grauens", year: 1922, duration: 93,
    tagline: "O vampiro que inventou o cinema de terror.",
    synopsis: "O corretor Thomas Hutter deixa a jovem esposa, Ellen, e viaja até os Cárpatos para vender uma casa ao misterioso conde Orlok. No castelo, descobre tarde demais que o cliente é um morto-vivo, que parte de navio rumo à cidade de Hutter levando a peste consigo. Livre adaptação não autorizada de Drácula.",
    genres: ["Terror", "Fantasia"], rating: "12", score: 7.8, popularity: 74,
    cast: "Max Schreck|Conde Orlok; Gustav von Wangenheim|Thomas Hutter; Greta Schröder|Ellen Hutter; Alexander Granach|Knock; Gustav Botz|Professor Sievers",
    directors: ["F. W. Murnau"], country: "Alemanha", languages: MUDO,
    keywords: "vampiro, expressionismo alemão, filme mudo, peste, clássico, domínio público",
    added: "2026-10-31", sourceId: "pd-nosferatu",
  }),
  movie({
    id: "gabinete-do-dr-caligari", title: "O Gabinete do Dr. Caligari", originalTitle: "Das Cabinet des Dr. Caligari", year: 1920, duration: 51,
    synopsis: "Numa feira de uma cidadezinha alemã, o sinistro Dr. Caligari exibe Cesare, um sonâmbulo que, segundo ele, conhece o futuro. Logo começam assassinatos misteriosos, e o jovem Francis decide investigar o doutor. Os cenários pintados e tortos fizeram dele o marco do expressionismo no cinema.",
    genres: ["Terror", "Suspense"], rating: "12", score: 8.0, popularity: 62,
    cast: "Werner Krauss|Dr. Caligari; Conrad Veidt|Cesare; Friedrich Fehér|Francis; Lil Dagover|Jane; Hans Heinrich von Twardowski|Alan",
    directors: ["Robert Wiene"], country: "Alemanha", languages: MUDO,
    keywords: "expressionismo alemão, sonâmbulo, loucura, filme mudo, clássico, domínio público",
    added: "2026-10-24", sourceId: "pd-caligari",
  }),
  movie({
    id: "a-general-1926", title: "A General", originalTitle: "The General", year: 1926, duration: 79,
    synopsis: "Geórgia, 1861. Recusado pelo exército confederado, o maquinista Johnnie Gray é tratado como covarde pela noiva, Annabelle. Quando espiões da União roubam sua amada locomotiva, a General, com Annabelle a bordo, Johnnie parte sozinho numa perseguição sobre trilhos. Buster Keaton faz as próprias acrobacias.",
    genres: ["Comédia", "Ação", "Aventura"], rating: "L", score: 8.1, popularity: 66,
    cast: "Buster Keaton|Johnnie Gray; Marion Mack|Annabelle Lee; Glen Cavender|Capitão Anderson; Jim Farley|General Thatcher; Frederick Vroom|General confederado",
    directors: ["Buster Keaton", "Clyde Bruckman"], country: "Estados Unidos", languages: MUDO,
    keywords: "trem, Guerra Civil Americana, perseguição, comédia muda, Buster Keaton, domínio público",
    added: "2026-09-20", sourceId: "pd-a-general",
  }),
  movie({
    id: "encouracado-potemkin", title: "O Encouraçado Potemkin", originalTitle: "Bronenosets Potyomkin", year: 1925, duration: 73,
    synopsis: "Em 1905, marinheiros do encouraçado Potemkin se revoltam contra os oficiais depois de receberem carne podre. A revolta chega ao porto de Odessa, onde a população apoia os amotinados e a repressão do exército czarista culmina na famosa sequência da escadaria, uma das mais estudadas da história do cinema.",
    genres: ["Drama"], rating: "14", score: 7.9, popularity: 52,
    cast: "Aleksandr Antonov|Grigory Vakulinchuk; Vladimir Barsky|Comandante Golikov; Grigori Aleksandrov|Tenente Gilyarovsky; Ivan Bobrov|Marinheiro",
    directors: ["Sergei Eisenstein"], country: "União Soviética", languages: MUDO,
    keywords: "motim, revolução de 1905, Odessa, montagem, cinema soviético, domínio público",
    added: "2026-08-14", sourceId: "pd-potemkin",
  }),
  movie({
    id: "jejum-de-amor", title: "Jejum de Amor", originalTitle: "His Girl Friday", year: 1940, duration: 92,
    synopsis: "A repórter Hildy Johnson aparece na redação para avisar ao ex-marido e ex-chefe, o editor Walter Burns, que vai se casar de novo e largar o jornalismo. Walter, decidido a reconquistá-la, a convence a cobrir uma última matéria: a execução de um condenado na véspera de uma eleição. Diálogos em velocidade recorde.",
    genres: ["Comédia", "Romance"], rating: "L", score: 7.8, popularity: 58,
    cast: "Cary Grant|Walter Burns; Rosalind Russell|Hildy Johnson; Ralph Bellamy|Bruce Baldwin; Gene Lockhart|Xerife Hartwell; John Qualen|Earl Williams",
    directors: ["Howard Hawks"], country: "Estados Unidos", languages: EN,
    keywords: "jornalismo, ex-casal, comédia maluca, redação, domínio público",
    added: "2026-07-03", sourceId: "pd-jejum-de-amor",
  }),
  movie({
    id: "curva-do-destino", title: "Curva do Destino", originalTitle: "Detour", year: 1945, duration: 68,
    synopsis: "O pianista Al Roberts atravessa os Estados Unidos de carona para reencontrar a namorada em Los Angeles. No caminho, uma morte acidental e uma passageira chamada Vera o prendem numa teia de mentiras da qual não consegue escapar. Filme noir de baixíssimo orçamento que virou cult.",
    genres: ["Crime", "Suspense"], rating: "14", score: 7.2, popularity: 44,
    cast: "Tom Neal|Al Roberts; Ann Savage|Vera; Claudia Drake|Sue Harvey; Edmund MacDonald|Charles Haskell Jr.",
    directors: ["Edgar G. Ulmer"], country: "Estados Unidos", languages: EN,
    keywords: "filme noir, estrada, carona, chantagem, domínio público",
    added: "2026-06-11", sourceId: "pd-curva-do-destino",
  }),
  movie({
    id: "o-estranho-1946", title: "O Estranho", originalTitle: "The Stranger", year: 1946, duration: 91,
    synopsis: "O investigador Wilson, da Comissão de Crimes de Guerra, segue a pista de Franz Kindler, idealizador dos campos de extermínio nazistas, até uma pacata cidade de Connecticut. Lá, Kindler vive como o professor Charles Rankin e acaba de se casar com a filha de um juiz da Suprema Corte.",
    genres: ["Suspense", "Crime", "Drama"], rating: "14", score: 7.3, popularity: 48,
    cast: "Edward G. Robinson|Sr. Wilson; Loretta Young|Mary Longstreet; Orson Welles|Charles Rankin / Franz Kindler; Philip Merivale|Juiz Adam Longstreet",
    directors: ["Orson Welles"], country: "Estados Unidos", languages: EN,
    keywords: "nazismo, criminoso de guerra, filme noir, cidade pequena, Orson Welles, domínio público",
    added: "2026-05-29", sourceId: "pd-o-estranho",
  }),
  movie({
    id: "fantasma-da-opera-1925", title: "O Fantasma da Ópera", originalTitle: "The Phantom of the Opera", year: 1925, duration: 106,
    synopsis: "Nos subterrâneos da Ópera de Paris vive um homem mascarado que se apaixona pela jovem cantora Christine Daaé e passa a aterrorizar a casa para transformá-la em estrela. A cena em que Christine arranca a máscara do Fantasma, com a maquiagem criada pelo próprio Lon Chaney, assustou plateias no mundo todo.",
    genres: ["Terror", "Romance"], rating: "12", score: 7.5, popularity: 55,
    cast: "Lon Chaney|Erik, o Fantasma; Mary Philbin|Christine Daaé; Norman Kerry|Visconde Raoul de Chagny; Arthur Edmund Carewe|Ledoux; Gibson Gowland|Simon Buquet",
    directors: ["Rupert Julian"], country: "Estados Unidos", languages: MUDO,
    keywords: "ópera, Paris, máscara, baseado em livro, Gaston Leroux, filme mudo, domínio público",
    added: "2026-04-17", sourceId: "pd-fantasma-da-opera",
  }),
  movie({
    id: "homem-com-uma-camera", title: "Um Homem com uma Câmera", originalTitle: "Chelovek s kino-apparatom", year: 1929, duration: 67,
    synopsis: "Do amanhecer à noite, um cinegrafista percorre cidades soviéticas filmando trabalho, lazer, nascimento, casamento e morte, enquanto a montadora corta e reorganiza as imagens diante de nós. Sem atores nem intertítulos, é um manifesto sobre o que o cinema pode fazer, eleito várias vezes o melhor documentário de todos os tempos.",
    genres: ["Documentário"], rating: "L", score: 8.2, popularity: 46,
    cast: "Mikhail Kaufman|O cinegrafista; Elizaveta Svilova|A montadora",
    directors: ["Dziga Vertov"], country: "União Soviética", languages: ["Sem diálogos"],
    keywords: "sinfonia urbana, metalinguagem, montagem, vanguarda, cinema soviético, domínio público",
    awarded: "Melhor documentário de todos os tempos (Sight and Sound, 2014)",
    added: "2026-03-30", sourceId: "pd-homem-com-uma-camera",
  }),
  movie({
    id: "viagem-a-lua", title: "Viagem à Lua", originalTitle: "Le Voyage dans la Lune", year: 1902, duration: 9,
    synopsis: "O professor Barbenfouillis convence um congresso de astrônomos a viajar até a Lua dentro de uma cápsula disparada por um canhão gigante. A cápsula acerta o olho da Lua, e os cientistas exploram crateras, cogumelos gigantes e o reino dos selenitas. O primeiro grande filme de ficção científica.",
    genres: ["Ficção científica", "Aventura", "Fantasia"], rating: "L", score: 8.1, popularity: 60,
    cast: "Georges Méliès|Professor Barbenfouillis; Bleuette Bernon|Phoebe; François Lallement|Oficial da Marinha; Henri Delannoy|Capitão do foguete",
    directors: ["Georges Méliès"], country: "França", languages: MUDO,
    keywords: "Lua, viagem espacial, efeitos especiais, curta-metragem, primeiro cinema, domínio público",
    added: "2026-10-05", sourceId: "pd-viagem-a-lua",
  }),
  movie({
    id: "com-as-horas-contadas", title: "Com as Horas Contadas", originalTitle: "D.O.A.", year: 1949, duration: 83,
    synopsis: "O contador Frank Bigelow entra numa delegacia de Los Angeles para comunicar um assassinato: o dele mesmo. Envenenado durante uma viagem a San Francisco, ele tem poucos dias de vida e os usa para descobrir quem o matou e por quê. Um dos pontos de partida mais famosos do filme noir.",
    genres: ["Crime", "Suspense"], rating: "14", score: 7.2, popularity: 42,
    cast: "Edmond O'Brien|Frank Bigelow; Pamela Britton|Paula Gibson; Luther Adler|Majak; Beverly Garland|Miss Foster; Neville Brand|Chester",
    directors: ["Rudolph Maté"], country: "Estados Unidos", languages: EN,
    keywords: "filme noir, envenenamento, investigação, contagem regressiva, domínio público",
    added: "2026-02-19", sourceId: "pd-com-as-horas-contadas",
  }),
  movie({
    id: "bancando-o-aguia", title: "Bancando o Águia", originalTitle: "Sherlock Jr.", year: 1924, duration: 45,
    synopsis: "Um projecionista que estuda para ser detetive é acusado injustamente de roubar o relógio do pai da namorada. De volta à cabine, ele cochila e, em sonho, entra literalmente na tela do cinema, onde vira o brilhante detetive Sherlock Jr. Os truques visuais de Buster Keaton continuam impressionantes um século depois.",
    genres: ["Comédia", "Aventura"], rating: "L", score: 8.2, popularity: 57,
    cast: "Buster Keaton|Projecionista / Sherlock Jr.; Kathryn McGuire|A garota; Joe Keaton|Pai da garota; Ward Crane|O galã local",
    directors: ["Buster Keaton"], country: "Estados Unidos", languages: MUDO,
    keywords: "detetive, cinema dentro do cinema, sonho, comédia muda, Buster Keaton, domínio público",
    added: "2026-09-02", sourceId: "pd-bancando-o-aguia",
  }),
  movie({
    id: "sao-paulo-sinfonia-da-metropole", title: "São Paulo, Sinfonia da Metrópole", year: 1929, duration: 95,
    synopsis: "Um dia na vida de São Paulo no fim dos anos 1920: fábricas, bondes, o Viaduto do Chá, o Instituto Butantan, escolas, o porto de Santos e o vaivém da cidade que crescia mais rápido no país. Feito por dois imigrantes húngaros, é uma das grandes sinfonias urbanas do cinema mudo e um registro precioso da cidade.",
    genres: ["Documentário"], rating: "L", score: 7.0, popularity: 50,
    cast: "",
    directors: ["Adalberto Kemeny", "Rudolf Rex Lustig"], country: "Brasil", languages: MUDO,
    keywords: "São Paulo, sinfonia urbana, cinema mudo brasileiro, anos 1920, história, domínio público",
    added: "2026-08-25", sourceId: "pd-sao-paulo-sinfonia",
  }),
];

// ------------------------------------------------------------------ séries
const sup = (n: number, title: string, original: string, synopsis: string, min: number): Ep =>
  [title, synopsis, min, { sourceId: `pd-superman-${n}`, originalTitle: original }];

const supermanFleischer = series({
  id: "superman-fleischer", title: "Superman: Os Desenhos Clássicos", originalTitle: "Superman (Fleischer Studios)", year: 1941,
  tagline: "Mais rápido que uma bala!",
  synopsis: "Os 17 curtas animados que levaram o Superman para o cinema entre 1941 e 1943, com animação luxuosa da Fleischer Studios (e, depois, da Famous Studios). Clark Kent e Lois Lane enfrentam cientistas loucos, robôs gigantes, vulcões e sabotadores. Alguns episódios de 1942–43 trazem propaganda de guerra e estereótipos raciais da época.",
  genres: ["Animação", "Ação", "Ficção científica"], rating: "10", score: 7.9, popularity: 64,
  cast: "Bud Collyer|Superman / Clark Kent (voz); Joan Alexander|Lois Lane (voz); Jackson Beck|Narrador; Julian Noa|Perry White (voz)",
  directors: ["Dave Fleischer", "Seymour Kneitel", "Isadore Sparber", "Dan Gordon"], country: "Estados Unidos", languages: EN,
  keywords: "super-herói, animação clássica, Fleischer, rotoscopia, Segunda Guerra, domínio público",
  added: "2026-10-12", seasonCount: 2, sourceId: "pd-superman-1",
  seasons: [
    {
      number: 1, year: 1941, total: 9, eps: [
        sup(1, "O Cientista Louco", "Superman", "Um cientista ameaça Metrópolis com um raio destruidor, e Lois vai atrás da notícia sozinha.", 10),
        sup(2, "Os Monstros Mecânicos", "The Mechanical Monsters", "Robôs gigantes voadores roubam bancos e joalherias, e Lois se esconde dentro de um deles.", 10),
        sup(3, "O Trem do Bilhão", "Billion Dollar Limited", "Bandidos tentam descarrilar o trem que leva um bilhão de dólares em ouro para a Casa da Moeda.", 9),
        sup(4, "O Gigante do Ártico", "The Arctic Giant", "Um dinossauro congelado há milênios desperta no museu de Metrópolis e sai pela cidade.", 9),
        sup(5, "Os Bólidos Humanos", "The Bulleteers", "Uma quadrilha num carro-foguete blindado chantageia a cidade, atacando prédios públicos.", 8),
        sup(6, "O Telescópio Magnético", "The Magnetic Telescope", "Um astrônomo puxa um cometa em direção à Terra com um ímã gigante, contra a ordem da polícia.", 8),
        sup(7, "Terremoto Elétrico", "Electric Earthquake", "Um cientista ameaça afundar Manhattan com terremotos provocados se não receber a ilha de volta.", 9),
        sup(8, "O Vulcão", "Volcano", "Um vulcão adormecido entra em erupção bem no dia em que Clark e Lois cobrem a festa na ilha.", 8),
        sup(9, "Terror no Parque", "Terror on the Midway", "Um gorila gigante escapa do circo e solta os outros animais no meio do público.", 8),
      ],
    },
    {
      number: 2, year: 1942, total: 8, eps: [
        sup(10, "Os Sabotadores", "Japoteurs", "Espiões sequestram um bombardeiro gigante com Lois a bordo. Propaganda de guerra com estereótipos da época.", 9),
        sup(11, "O Impostor", "Showdown", "Um bandido se fantasia de Superman para cometer crimes e manchar a reputação do herói.", 8),
        sup(12, "A Hora Onze", "Eleventh Hour", "Prisioneiro no Japão em guerra, Clark sabota navios toda noite às onze. Propaganda de guerra com estereótipos da época.", 8),
        sup(13, "Destruição S.A.", "Destruction, Inc.", "Lois se infiltra numa fábrica de munições para desmascarar sabotadores.", 9),
        sup(14, "A Múmia Ataca", "The Mummy Strikes", "No museu, uma múmia egípcia parece ganhar vida para proteger um túmulo amaldiçoado.", 8),
        sup(15, "Tambores na Selva", "Jungle Drums", "Depois de um avião cair na selva, Lois é capturada por agentes inimigos. Propaganda de guerra com estereótipos da época.", 8),
        sup(16, "O Mundo Subterrâneo", "The Underground World", "Lois e um cientista descem a uma caverna escondida habitada por homens-pássaro.", 8),
        sup(17, "O Agente Secreto", "Secret Agent", "Superman escolta uma agente do governo que leva provas contra uma rede de espionagem.", 8),
      ],
    },
  ],
});

const cc = (n: number, title: string, original: string, synopsis: string, min: number): Ep =>
  [title, synopsis, min, { sourceId: `pd-chaplin-${n}`, originalTitle: original }];

const chaplinMutual = series({
  id: "chaplin-mutual", title: "Carlitos: As Comédias da Mutual", originalTitle: "Chaplin's Mutual Comedies", year: 1916,
  tagline: "Os doze curtas que Chaplin considerava os mais felizes da carreira.",
  synopsis: "Entre 1916 e 1917, Charlie Chaplin escreveu, dirigiu e estrelou doze comédias de dois rolos para a Mutual Film, com liberdade total e o maior salário do mundo na época. O Vagabundo Carlitos enfrenta lojas de departamento, rinques de patinação, uma rua violenta e uma viagem de navio para a América.",
  genres: ["Comédia"], rating: "L", score: 7.7, popularity: 61,
  cast: "Charlie Chaplin|Carlitos; Edna Purviance|Edna; Eric Campbell|O grandalhão; Albert Austin|Coadjuvante; Henry Bergman|Coadjuvante",
  directors: ["Charlie Chaplin"], country: "Estados Unidos", languages: MUDO,
  keywords: "Carlitos, vagabundo, comédia muda, pastelão, curtas, domínio público",
  added: "2026-07-21", seasonCount: 1, sourceId: "pd-chaplin-1",
  seasons: [
    {
      number: 1, year: 1916, total: 12, eps: [
        cc(1, "Carlitos no Armazém", "The Floorwalker", "Numa loja de departamentos, Carlitos é confundido com um gerente ladrão. Inclui a famosa escada rolante.", 19),
        cc(2, "Carlitos Bombeiro", "The Fireman", "O bombeiro mais atrapalhado do quartel vira herói por acaso num incêndio de verdade.", 16),
        cc(3, "O Vagabundo", "The Vagabond", "Um violinista de rua salva uma moça maltratada por ciganos e se apaixona por ela.", 27),
        cc(4, "Uma Hora da Manhã", "One A.M.", "Chaplin quase sozinho em cena: um bêbado tenta, sem sucesso, chegar até a cama.", 17),
        cc(5, "O Conde", "The Count", "O ajudante de um alfaiate se passa por conde para entrar numa festa da alta sociedade.", 20),
        cc(6, "Casa de Penhores", "The Pawnshop", "O funcionário de uma casa de penhores desmonta um despertador inteiro para avaliá-lo.", 20),
        cc(7, "Atrás da Tela", "Behind the Screen", "Nos bastidores de um estúdio de cinema, o assistente faz todo o trabalho e acaba numa guerra de tortas.", 20),
        cc(8, "O Rinque", "The Rink", "Garçom de dia e patinador elegante à noite, Carlitos causa o caos numa festa sobre rodas.", 19),
        cc(9, "Rua da Paz", "Easy Street", "Recém-convertido, Carlitos vira policial na rua mais perigosa da cidade.", 23),
        cc(10, "A Cura", "The Cure", "Um bêbado chega a uma estação de águas para se tratar, levando uma mala cheia de bebida.", 19),
        cc(11, "O Imigrante", "The Immigrant", "A viagem de navio até a América e um jantar num restaurante sem dinheiro para pagar a conta.", 20),
        cc(12, "O Aventureiro", "The Adventurer", "Um presidiário foge, salva uma moça rica de afogamento e vai parar na mansão da família dela.", 19),
      ],
    },
  ],
});

export const PUBLIC_DOMAIN_TITLES: Title[] = [...pdMovies, supermanFleischer, chaplinMutual];
