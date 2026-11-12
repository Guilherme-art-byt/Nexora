import type { AgeRating, Season, Title } from "@/types";
import { slugify } from "@/lib/format";
import { load, save } from "@/lib/storage";
import { repo, tmdbTransport } from "./index";
import { RepoError } from "./repository";
import type { SupabaseRepository } from "./supabaseRepository";

/**
 * Integração TMDB (metadados). A chave fica SOMENTE na Edge Function `tmdb-proxy`
 * (supabase/functions/tmdb-proxy). O navegador nunca vê a chave.
 * Metadados e trailers não autorizam a exibição das obras completas.
 */

const IMG = "https://image.tmdb.org/t/p/";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function call(path: string, params: Record<string, string> = {}): Promise<any> {
  if (!tmdbTransport) throw new RepoError("Integração TMDB desativada. Veja a seção \"Integração TMDB\" do README.");
  if (tmdbTransport === "proxy") {
    const qs = new URLSearchParams({ language: "pt-BR", ...params });
    const res = await fetch(`/api/tmdb${path}?${qs}`);
    if (!res.ok) throw new RepoError(`O TMDB respondeu ${res.status}. Confira TMDB_API_KEY no servidor.`);
    return res.json();
  }
  const sb = (repo as SupabaseRepository).sb;
  const { data, error } = await sb.functions.invoke("tmdb-proxy", { body: { path, params: { language: "pt-BR", ...params } } });
  if (error) throw new RepoError("O TMDB não respondeu. Confira a função tmdb-proxy e o segredo TMDB_API_KEY.");
  return data;
}

export interface TmdbHit {
  id: number;
  kind: "movie" | "series";
  title: string;
  year?: number;
  poster?: string;
  overview: string;
}

export async function searchTmdb(query: string): Promise<TmdbHit[]> {
  const data = await call("/search/multi", { query, include_adult: "false" });
  return (data.results ?? [])
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .map((r: any) => ({
      id: r.id,
      kind: r.media_type === "tv" ? "series" : "movie",
      title: r.title ?? r.name,
      year: Number((r.release_date ?? r.first_air_date ?? "").slice(0, 4)) || undefined,
      poster: r.poster_path ? IMG + "w185" + r.poster_path : undefined,
      overview: r.overview ?? "",
    }));
}

const BR_RATINGS: Record<string, AgeRating> = { L: "L", "10": "10", "12": "12", "14": "14", "16": "16", "18": "18" };

export async function importFromTmdb(hit: Pick<TmdbHit, "id" | "kind">): Promise<Title> {
  const isTv = hit.kind === "series";
  const d = await call(`/${isTv ? "tv" : "movie"}/${hit.id}`, {
    append_to_response: isTv ? "credits,videos,content_ratings" : "credits,videos,release_dates",
  });

  let rating: AgeRating = "14";
  if (isTv) {
    const br = d.content_ratings?.results?.find((r: any) => r.iso_3166_1 === "BR")?.rating;
    if (br && BR_RATINGS[br]) rating = BR_RATINGS[br];
  } else {
    const br = d.release_dates?.results?.find((r: any) => r.iso_3166_1 === "BR")?.release_dates?.find((x: any) => x.certification)?.certification;
    if (br && BR_RATINGS[br]) rating = BR_RATINGS[br];
  }

  const trailer = (d.videos?.results ?? []).find((v: any) => v.site === "YouTube" && v.type === "Trailer");
  const name: string = d.title ?? d.name;
  const id = `${slugify(name)}-${hit.id}`;

  let seasons: Season[] | undefined;
  if (isTv) {
    const nums: number[] = (d.seasons ?? []).map((s: any) => s.season_number).filter((n: number) => n > 0).slice(0, 6);
    seasons = await Promise.all(
      nums.map(async (n) => {
        const s = await call(`/tv/${hit.id}/season/${n}`);
        return {
          number: n,
          year: Number((s.air_date ?? "").slice(0, 4)) || new Date().getFullYear(),
          episodes: (s.episodes ?? []).map((e: any) => ({
            id: `${id}-t${n}e${e.episode_number}`,
            number: e.episode_number,
            title: e.name,
            synopsis: e.overview ?? "",
            durationMin: e.runtime ?? d.episode_run_time?.[0] ?? 45,
            thumbnail: e.still_path ? IMG + "w300" + e.still_path : undefined,
          })),
        };
      }),
    );
  }

  return {
    id, kind: hit.kind, title: name, tagline: d.tagline || undefined, synopsis: d.overview ?? "",
    year: Number((d.release_date ?? d.first_air_date ?? "").slice(0, 4)) || new Date().getFullYear(),
    genres: (d.genres ?? []).map((g: any) => g.name),
    rating, score: Math.round((d.vote_average ?? 0) * 10) / 10, popularity: Math.min(100, Math.round(d.popularity ?? 50)),
    durationMin: isTv ? undefined : d.runtime ?? undefined, seasons,
    cast: (d.credits?.cast ?? []).slice(0, 12).map((c: any) => ({ name: c.name, role: c.character })),
    directors: isTv
      ? (d.created_by ?? []).map((c: any) => c.name)
      : (d.credits?.crew ?? []).filter((c: any) => c.job === "Director").map((c: any) => c.name),
    country: (d.production_countries ?? []).map((c: any) => c.name).join(", "),
    languages: (d.spoken_languages ?? []).map((l: any) => l.name || l.english_name),
    subtitles: [],
    keywords: [],
    poster: d.poster_path ? IMG + "w500" + d.poster_path : "",
    backdrop: d.backdrop_path ? IMG + "w1280" + d.backdrop_path : "",
    trailerYoutubeKey: trailer?.key,
    addedAt: new Date().toISOString(),
    origin: "tmdb",
    tmdbId: hit.id,
  };
}

// ---------------------------------------------------------------- imagens oficiais do catálogo
interface OfficialArt {
  tmdbId: number;
  poster?: string;
  backdrop?: string;
  trailer?: string;
  stills?: Record<string, string>; // episodeId -> imagem
}

const CACHE_KEY = "tmdb-art-v1";

async function findOfficial(t: Title): Promise<OfficialArt | null> {
  const isTv = t.kind === "series";
  const query = t.originalTitle ?? t.title;
  const search = await call(`/search/${isTv ? "tv" : "movie"}`, {
    query,
    ...(isTv ? { first_air_date_year: String(t.year) } : { primary_release_year: String(t.year) }),
  });
  const hit = search.results?.[0];
  if (!hit) return null;
  const d = await call(`/${isTv ? "tv" : "movie"}/${hit.id}`, { append_to_response: "videos", include_video_language: "pt,en" });
  const videos: any[] = d.videos?.results ?? [];
  const trailer = videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.iso_639_1 === "pt") ?? videos.find((v) => v.site === "YouTube" && v.type === "Trailer");
  const art: OfficialArt = {
    tmdbId: hit.id,
    poster: d.poster_path ? IMG + "w500" + d.poster_path : undefined,
    backdrop: d.backdrop_path ? IMG + "w1280" + d.backdrop_path : undefined,
    trailer: trailer?.key,
  };
  if (isTv && t.seasons?.length) {
    art.stills = {};
    for (const s of t.seasons) {
      const season = await call(`/tv/${hit.id}/season/${s.number}`);
      for (const e of season.episodes ?? []) {
        const ep = s.episodes.find((x) => x.number === e.episode_number);
        if (ep && e.still_path) art.stills[ep.id] = IMG + "w300" + e.still_path;
      }
    }
  }
  return art;
}

function applyArt(t: Title, a?: OfficialArt | null): Title {
  if (!a) return t;
  return {
    ...t,
    tmdbId: a.tmdbId,
    poster: a.poster ?? t.poster,
    backdrop: a.backdrop ?? t.backdrop,
    trailerYoutubeKey: t.trailerYoutubeKey ?? a.trailer,
    seasons: t.seasons?.map((s) => ({ ...s, episodes: s.episodes.map((e) => ({ ...e, thumbnail: e.thumbnail ?? a.stills?.[e.id] })) })),
  };
}

/**
 * Troca as artes ilustrativas pelos pôsteres, fundos, trailers e miniaturas oficiais do TMDB.
 * Resultado em cache no navegador; só consulta títulos ainda não resolvidos.
 */
let inFlight: Promise<Title[]> | null = null;

export function withOfficialArt(titles: Title[], opts: { force?: boolean } = {}): Promise<Title[]> {
  // evita consultas duplicadas quando o catálogo é carregado mais de uma vez ao mesmo tempo
  if (!opts.force && inFlight) return inFlight;
  const run = resolveOfficialArt(titles, opts).finally(() => { if (inFlight === run) inFlight = null; });
  if (!opts.force) inFlight = run;
  return run;
}

async function resolveOfficialArt(titles: Title[], opts: { force?: boolean }): Promise<Title[]> {
  const cache = opts.force ? {} : load<Record<string, OfficialArt | null>>(CACHE_KEY, {});
  const pending = titles.filter((t) => t.origin === "demo" && !(t.id in cache));
  for (let i = 0; i < pending.length; i += 4) {
    await Promise.all(
      pending.slice(i, i + 4).map(async (t) => {
        try { cache[t.id] = await findOfficial(t); } catch { /* tenta de novo na próxima carga */ }
      }),
    );
  }
  save(CACHE_KEY, cache);
  return titles.map((t) => (t.origin === "demo" ? applyArt(t, cache[t.id]) : t));
}
