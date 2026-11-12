import type { Library } from "./repository";
import type { ProfilePreferences, Title } from "@/types";

/**
 * Recomendações por perfil, calculadas a partir de:
 * gêneros assistidos (ponderados pelo quanto foi assistido), Minha Lista, avaliações,
 * gêneros favoritos nas preferências, popularidade e nota.
 * Sem histórico, devolve populares e lançamentos.
 */
export function recommend(titles: Title[], lib: Library, prefs?: ProfilePreferences, limit = 18): { items: Title[]; personalized: boolean } {
  const byId = new Map(titles.map((t) => [t.id, t]));
  const affinity = new Map<string, number>();
  const bump = (t: Title | undefined, w: number) => t?.genres.forEach((g) => affinity.set(g, (affinity.get(g) ?? 0) + w));

  for (const p of lib.progress) bump(byId.get(p.titleId), 1 + Math.min(1, p.position / Math.max(1, p.duration)) * 2);
  for (const id of lib.myList) bump(byId.get(id), 2);
  for (const r of lib.ratings) bump(byId.get(r.titleId), r.value * 3);
  for (const g of prefs?.favoriteGenres ?? []) affinity.set(g, (affinity.get(g) ?? 0) + 2.5);

  const seen = new Set([...lib.progress.filter((p) => p.finished && !p.episodeId).map((p) => p.titleId), ...lib.myList]);
  const disliked = new Set(lib.ratings.filter((r) => r.value < 0).map((r) => r.titleId));
  const personalized = affinity.size > 0;

  const scored = titles
    .filter((t) => !seen.has(t.id) && !disliked.has(t.id))
    .map((t) => {
      const g = t.genres.reduce((s, gen) => s + Math.max(0, affinity.get(gen) ?? 0), 0) / Math.sqrt(t.genres.length || 1);
      const fresh = Date.now() - new Date(t.addedAt).getTime() < 30 * 86400_000 ? 1.5 : 0;
      const score = (personalized ? g * 3 : 0) + t.popularity / 25 + t.score / 2 + fresh;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score);

  return { items: scored.slice(0, limit).map((s) => s.t), personalized };
}

/** Títulos parecidos: gêneros em comum, palavras-chave e pessoas. */
export function similarTo(t: Title, titles: Title[], limit = 12): Title[] {
  const people = new Set([...t.cast.map((c) => c.name), ...t.directors]);
  return titles
    .filter((x) => x.id !== t.id)
    .map((x) => {
      const g = x.genres.filter((gen) => t.genres.includes(gen)).length * 3;
      const k = x.keywords.filter((kw) => t.keywords.includes(kw)).length * 2;
      const p = [...x.cast.map((c) => c.name), ...x.directors].filter((n) => people.has(n)).length * 1.5;
      return { x, s: g + k + p + x.popularity / 100 };
    })
    .filter((r) => r.s > 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.x);
}
