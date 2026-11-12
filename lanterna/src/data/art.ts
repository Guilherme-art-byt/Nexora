import covers from "./covers.json";

/**
 * Capas dos títulos do catálogo.
 * 1. Capas oficiais do TMDB (src/data/covers.json, gerado por scripts/fetch-covers.mjs):
 *    só os endereços ficam no projeto; as imagens são servidas por image.tmdb.org.
 * 2. Sem capa oficial, usa a ilustração original gerada por scripts/generate_art.py.
 */
const TMDB_IMG = "https://image.tmdb.org/t/p/";

interface Cover {
  tmdbId: number;
  poster?: string;
  backdrop?: string;
  stills?: Record<string, string>; // episodeId -> caminho da miniatura
}
const COVERS = covers as Record<string, Cover>;

const files = import.meta.glob("../assets/art/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const name = path.split("/").pop()!.replace(".jpg", "");
  byName[name] = url;
}

export function art(id: string, kind: "poster" | "backdrop"): string {
  const path = COVERS[id]?.[kind];
  if (path) return TMDB_IMG + (kind === "poster" ? "w500" : "w1280") + path;
  return byName[`${id}-${kind}`] ?? "";
}

export function cover(id: string): { tmdbId: number; still(episodeId: string): string | undefined } | undefined {
  const c = COVERS[id];
  if (!c) return undefined;
  return { tmdbId: c.tmdbId, still: (ep) => (c.stills?.[ep] ? TMDB_IMG + "w300" + c.stills[ep] : undefined) };
}
