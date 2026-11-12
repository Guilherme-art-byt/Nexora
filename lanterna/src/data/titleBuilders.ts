import type { AgeRating, Person, Season, Title } from "@/types";
import { art, cover } from "./art";

/** Construtores usados pelos arquivos de catálogo. */
const people = (s: string): Person[] =>
  s.split(";").filter((p) => p.trim()).map((p) => {
    const [name, role] = p.split("|").map((x) => x.trim());
    return { name, role };
  });

export interface Base {
  id: string;
  title: string;
  originalTitle?: string;
  tagline?: string;
  synopsis: string;
  year: number;
  genres: string[];
  rating: AgeRating;
  score: number;
  popularity: number;
  cast: string;
  directors: string[];
  country: string;
  languages: string[];
  keywords: string;
  awarded?: string; // descrição do prêmio principal
  added: string;
  sourceId?: string; // fonte de vídeo (padrão: vídeo de demonstração)
}

const common = (b: Base) => ({
  id: b.id,
  title: b.title,
  originalTitle: b.originalTitle,
  tagline: b.tagline,
  synopsis: b.synopsis,
  year: b.year,
  genres: b.genres,
  rating: b.rating,
  score: b.score,
  popularity: b.popularity,
  cast: people(b.cast),
  directors: b.directors,
  country: b.country,
  languages: b.languages,
  subtitles: ["Português", "Inglês", "Espanhol"],
  keywords: b.keywords.split(",").map((k) => k.trim()),
  poster: art(b.id, "poster"),
  backdrop: art(b.id, "backdrop"),
  sourceId: b.sourceId ?? "demo",
  awarded: !!b.awarded,
  awards: b.awarded,
  addedAt: b.added,
  origin: "demo" as const,
  tmdbId: cover(b.id)?.tmdbId,
});

export const movie = (b: Base & { duration: number }): Title => ({ ...common(b), kind: "movie", durationMin: b.duration });

export type Ep = [title: string, synopsis: string, minutes: number, extra?: { sourceId?: string; originalTitle?: string }];
export const series = (b: Base & { seasonCount: number; seasons: { number?: number; year: number; total?: number; eps: Ep[] }[] }): Title => ({
  ...common(b),
  kind: "series",
  seasonCount: b.seasonCount,
  seasons: b.seasons.map<Season>((s, si) => {
    const n = s.number ?? si + 1;
    return {
      number: n,
      year: s.year,
      totalEpisodes: s.total,
      episodes: s.eps.map(([title, synopsis, durationMin, extra], ei) => ({
        id: `${b.id}-t${n}e${ei + 1}`,
        number: ei + 1,
        title,
        synopsis,
        durationMin,
        thumbFocus: (ei * 23 + si * 37) % 100,
        sourceId: extra?.sourceId,
        originalTitle: extra?.originalTitle,
        thumbnail: cover(b.id)?.still(`${b.id}-t${n}e${ei + 1}`),
      })),
    };
  }),
});

export const PT = ["Português"];
export const EN = ["Inglês"];

