import type { VideoSource } from "@/types";

/**
 * Fontes de vídeo de DOMÍNIO PÚBLICO, servidas pelo Internet Archive (archive.org).
 *
 * Critério: obras publicadas há mais de 70 anos (Lei 9.610/98, art. 44: obras audiovisuais
 * entram em domínio público 70 anos após 1º de janeiro do ano seguinte à divulgação) e que
 * também estão em domínio público nos EUA (publicadas antes de 1931 ou sem renovação de
 * copyright). Os arquivos foram conferidos: MP4 com vídeo H.264 e áudio AAC, que tocam em
 * qualquer navegador.
 *
 * O endereço archive.org/download/... redireciona para o servidor que guarda o arquivo.
 */
const IA = "https://archive.org/download/";

function ia(id: string, name: string, item: string, file: string, height: number): VideoSource {
  return {
    id: `pd-${id}`,
    name,
    kind: "file",
    license: `Domínio público. Arquivo do Internet Archive: archive.org/details/${item}`,
    renditions: [{ label: `${height}p`, height, src: IA + item + "/" + encodeURIComponent(file) }],
    audio: [{ id: "orig", label: "Original", lang: "orig" }], // áudio embutido no arquivo
    subtitles: [],
  };
}

// ------------------------------------------------------------------ filmes
const MOVIES: VideoSource[] = [
  ia("nosferatu", "Nosferatu (1922)", "Nosferatu_most_complete_version_93_mins.", "Nosferatu_1922_Symphony_of_Horror_512kb.mp4", 240),
  ia("caligari", "O Gabinete do Dr. Caligari (1920)", "DasKabinettdesDoktorCaligariTheCabinetofDrCaligari", "The_Cabinet_of_Dr._Caligari_512kb.mp4", 240),
  ia("a-general", "A General (1926)", "The_General_Buster_Keaton", "The_General.mp4", 480),
  ia("potemkin", "O Encouraçado Potemkin (1925)", "BattleshipPotemkin", "Battleship_Potemkin_512kb.mp4", 240),
  ia("jejum-de-amor", "Jejum de Amor (1940)", "his_girl_friday", "his_girl_friday.mp4", 480),
  ia("curva-do-destino", "Curva do Destino (1945)", "Detour", "Detour.mp4", 480),
  ia("o-estranho", "O Estranho (1946)", "TheStranger_0", "The_Stranger.mp4", 480),
  ia("fantasma-da-opera", "O Fantasma da Ópera (1925)", "ThePhantomoftheOpera", "Phantom_of_the_Opera_512kb.mp4", 240),
  ia("homem-com-uma-camera", "Um Homem com uma Câmera (1929)", "ChelovekskinoapparatomManWithAMovieCamera", "Chelovek_s_kino-apparatom_512kb.mp4", 240),
  ia("viagem-a-lua", "Viagem à Lua (1902)", "6007_Trip_to_the_Moon_A_08_38_20_04", "6007_Trip_to_the_Moon_A_08_38_20_04.mp4", 480),
  ia("com-as-horas-contadas", "Com as Horas Contadas (1949)", "thoseguysontheradio_gmail_Doa", "doa_1949.mp4", 480),
  ia("bancando-o-aguia", "Bancando o Águia (1924)", "sherlockjr1924_201909", "Sherlock Jr. - Buster Keaton (1924) HD [720p].mp4", 720),
  ia("sao-paulo-sinfonia", "São Paulo, Sinfonia da Metrópole (1929)", "sao-paulo-a-sinfonia-eng-vtt-subs-1929", "São Paulo, A Sinfonia da Metrópole (1929).webm - Wikimedia Commons.mp4", 480),
];

// ------------------------------------------------------------------ séries (um arquivo por episódio)
const SUPERMAN_FILES = [
  "Superman.mp4", "Superman-TheMechanicalMonsters.mp4", "Superman - Billion Dollar Limited.mp4", "Superman-TheArcticGiant.mp4",
  "Superman-TheBulleteers.mp4", "Superman-TheMagneticTelescope.mp4", "Superman-ElectricEarthquake.mp4", "Superman-Volcano.mp4",
  "Superman-TerrorOnTheMidway.mp4", "Superman-Japoteurs.mp4", "Superman-Showdown.mp4", "Superman-EleventhHour.mp4",
  "Superman-DestructionInc..mp4", "Superman-TheMummyStrikes.mp4", "Superman-JungleDrums.mp4", "Superman-TheUndergroundWorld1943.mp4",
  "Superman-SecretAgent.mp4",
];
const SUPERMAN: VideoSource[] = SUPERMAN_FILES.map((f, i) =>
  ia(`superman-${i + 1}`, `Superman (Fleischer), episódio ${i + 1}`, "MaxFleischerSuperman", f, 360),
);

const CHAPLIN: [item: string, file: string, height: number][] = [
  ["CC_1916_05_15_TheFloorwalker", "CC_1916_05_15_TheFloorwalker_512kb.mp4", 240],
  ["CC_1916_06_12_TheFireman", "CC_1916_06_12_TheFireman_512kb.mp4", 240],
  ["the-vagabond-1916-directed-by-charlie-chaplin", "The Vagabond (1916) Directed by Charlie Chaplin.mp4", 1080],
  ["CC_1916_08_07_One_A_M", "CC_1916_08_07_One_A_M_512kb.mp4", 240],
  ["CC_1916_09_04_TheCount", "CC_1916_09_04_TheCount_512kb.mp4", 240],
  ["CC_1916_10_02_ThePawnshop", "CC_1916_10_02_ThePawnshop_512kb.mp4", 240],
  ["CC_1916_11_13_BehindtheScreen", "CC_1916_11_13_BehindtheScreen_512kb.mp4", 240],
  ["CC_1916_12_04_TheRink", "CC_1916_12_04_TheRink_512kb.mp4", 240],
  ["EasyStreet1917", "Easy-Street-v2.mp4", 480],
  ["CC_1917_04_16_TheCure", "CC_1917_04_16_TheCure_512kb.mp4", 240],
  ["CC_1917_06_17_TheImmigrant", "CC_1917_06_17_TheImmigrant_512kb.mp4", 240],
  ["CC_1917_10_22_TheAdventurer", "CC_1917_10_22_TheAdventurer_512kb.mp4", 240],
];
const CHAPLIN_SOURCES: VideoSource[] = CHAPLIN.map(([item, file, h], i) =>
  ia(`chaplin-${i + 1}`, `Carlitos: Comédias da Mutual, episódio ${i + 1}`, item, file, h),
);

export const PUBLIC_DOMAIN_SOURCES: VideoSource[] = [...MOVIES, ...SUPERMAN, ...CHAPLIN_SOURCES];

/** Fontes embutidas no app (não podem ser excluídas pelo painel). */
export const isBuiltInSource = (id: string) => id === "demo" || id.startsWith("pd-");
