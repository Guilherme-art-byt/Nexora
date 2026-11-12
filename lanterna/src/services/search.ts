import { normalize } from "@/lib/format";
import type { Title } from "@/types";

export interface SearchSuggestion {
  type: "title" | "person" | "genre";
  label: string;
  sub?: string;
  titleId?: string;
}

/** Busca sem diferenciar maiúsculas/minúsculas nem acentos, com pesos por campo. */
export function searchTitles(titles: Title[], query: string): Title[] {
  const q = normalize(query);
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = titles.map((t) => {
    const fields: [string, number][] = [
      [normalize(t.title), 10],
      [normalize(t.originalTitle ?? ""), 9],
      [normalize(t.genres.join(" ")), 5],
      [normalize(t.cast.map((c) => c.name).join(" ")), 6],
      [normalize(t.directors.join(" ")), 6],
      [normalize(t.keywords.join(" ")), 4],
      [normalize(t.synopsis), 1],
    ];
    let score = 0;
    for (const term of terms) {
      let hit = 0;
      for (const [text, w] of fields) {
        if (text.startsWith(term)) hit = Math.max(hit, w * 1.5);
        else if (text.includes(" " + term)) hit = Math.max(hit, w * 1.2);
        else if (text.includes(term)) hit = Math.max(hit, w);
      }
      if (!hit) return { t, score: 0 };
      score += hit;
    }
    return { t, score: score + t.popularity / 100 };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.t);
}

export function suggestions(titles: Title[], query: string, limit = 7): SearchSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const out: SearchSuggestion[] = [];
  for (const t of searchTitles(titles, query).slice(0, 4)) {
    out.push({ type: "title", label: t.title, sub: `${t.kind === "movie" ? "Filme" : "Série"} de ${t.year}`, titleId: t.id });
  }
  const people = new Map<string, string>();
  for (const t of titles) {
    for (const c of t.cast) if (normalize(c.name).includes(q)) people.set(c.name, "Elenco");
    for (const d of t.directors) if (normalize(d).includes(q)) people.set(d, "Direção");
  }
  for (const [name, role] of [...people].slice(0, 2)) out.push({ type: "person", label: name, sub: role });
  const genres = new Set(titles.flatMap((t) => t.genres).filter((g) => normalize(g).includes(q)));
  for (const g of [...genres].slice(0, 2)) out.push({ type: "genre", label: g, sub: "Gênero" });
  return out.slice(0, limit);
}
