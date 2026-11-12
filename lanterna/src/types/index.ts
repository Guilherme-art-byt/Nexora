export type TitleKind = "movie" | "series";

export type AgeRating = "L" | "10" | "12" | "14" | "16" | "18";

export interface Person {
  name: string;
  role?: string; // personagem (elenco) ou função
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  synopsis: string;
  durationMin: number;
  /** posição da miniatura dentro do backdrop da série (demo) */
  thumbFocus?: number;
  thumbnail?: string;
  /** título original do episódio (usado para buscar a miniatura oficial) */
  originalTitle?: string;
  /** fonte de vídeo própria do episódio; sem ela, usa a fonte do título */
  sourceId?: string;
}

export interface Season {
  number: number;
  title?: string;
  year: number;
  totalEpisodes?: number; // total real quando a lista é uma amostra
  episodes: Episode[];
}

export interface Title {
  id: string;
  kind: TitleKind;
  title: string;
  originalTitle?: string;
  tagline?: string;
  synopsis: string;
  year: number;
  genres: string[];
  rating: AgeRating;
  score: number; // 0–10
  popularity: number; // 0–100
  durationMin?: number; // filmes
  seasons?: Season[]; // séries (pode ser uma amostra)
  seasonCount?: number; // total real de temporadas da série
  cast: Person[];
  directors: string[];
  country: string;
  languages: string[];
  subtitles: string[];
  keywords: string[];
  poster: string;
  backdrop: string;
  trailerSourceId?: string;
  trailerYoutubeKey?: string; // trailer oficial (TMDB/YouTube), reproduzido pelo player do YouTube
  sourceId?: string; // fonte de vídeo autorizada (ver VideoSource)
  original?: boolean;
  awarded?: boolean;
  awards?: string; // ex.: "Oscar de melhor filme"
  addedAt: string; // ISO — usado para "lançamentos"
  origin?: "demo" | "admin" | "tmdb";
  tmdbId?: number;
}

export interface VideoRendition {
  label: string; // "720p"
  height: number;
  src: string;
}

export interface AudioTrack {
  id: string;
  label: string;
  lang: string;
  src?: string; // trilha separada sincronizada; vazio = áudio embutido no vídeo
}

export interface SubtitleTrack {
  id: string;
  label: string;
  lang: string;
  vtt: string; // conteúdo WebVTT ou URL
}

export interface VideoSource {
  id: string;
  name: string;
  kind: "file" | "hls" | "demo";
  renditions: VideoRendition[];
  audio: AudioTrack[];
  subtitles: SubtitleTrack[];
  license: string; // de onde vem a autorização de exibição
}

export type Role = "user" | "admin";

export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  avatar?: string; // data URL
  disabled?: boolean;
}

export interface StoredAccount extends Account {
  passwordHash: string;
  salt: string;
}

export interface Profile {
  id: string;
  accountId: string; // "guest" para visitante
  name: string;
  color: string;
  kids: boolean;
  avatar?: string;
  preferences: ProfilePreferences;
}

export interface ProfilePreferences {
  autoplayNext: boolean;
  subtitleLang: string; // "off" | "pt" | ...
  audioLang: string;
  quality: "auto" | string;
  favoriteGenres: string[];
  reduceMotion: boolean;
}

export interface ProgressEntry {
  titleId: string;
  episodeId?: string;
  season?: number;
  episode?: number;
  position: number; // segundos
  duration: number; // segundos
  updatedAt: string;
  finished: boolean;
}

export interface Rating {
  titleId: string;
  value: 1 | -1; // gostei / não gostei
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  titleId?: string;
  createdAt: string;
  read: boolean;
}

export interface ViewEvent {
  titleId: string;
  profileId: string;
  at: string;
}

export interface SortOption {
  value: "popular" | "recent" | "score" | "az" | "year";
  label: string;
}
