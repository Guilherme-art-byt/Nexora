import { useMemo } from "react";
import { ContinueWatching } from "@/components/ContinueWatching";
import { CatalogError } from "@/components/ErrorState";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieCarousel } from "@/components/MovieCarousel";
import { HeroSkeleton, RowSkeleton } from "@/components/ui";
import { useDocumentTitle } from "@/hooks";
import { recommend } from "@/services/recommendations";
import { useApp } from "@/store/app";
import type { Title } from "@/types";

const GENRE_ROWS: [string, string][] = [
  ["Ação", "Filmes de ação"],
  ["Terror", "Terror"],
  ["Comédia", "Comédia"],
  ["Ficção científica", "Ficção científica"],
  ["Crime", "Crime"],
  ["Suspense", "Suspense"],
  ["Drama", "Drama"],
  ["Documentário", "Documentários"],
];

export function byPopularity(a: Title, b: Title) { return b.popularity - a.popularity; }
export function byRecent(a: Title, b: Title) { return b.addedAt.localeCompare(a.addedAt); }

export default function Home() {
  useDocumentTitle();
  const { titles, catalogStatus, reloadCatalog, library, profile } = useApp();

  const rows = useMemo(() => {
    const popular = [...titles].sort(byPopularity);
    const hero = [...titles].filter((t) => t.popularity >= 92).sort(byRecent).slice(0, 5);
    const rec = recommend(titles, library, profile.preferences);
    return {
      hero: hero.length ? hero : popular.slice(0, 5),
      rec,
      trending: popular.slice(0, 10),
      brazil: popular.filter((t) => t.country.includes("Brasil")),
      fullFree: popular.filter((t) => t.sourceId?.startsWith("pd-")),
      animation: popular.filter((t) => t.genres.includes("Anime") || t.genres.includes("Animação")),
      recent: [...titles].sort(byRecent).slice(0, 14),
      movies: popular.filter((t) => t.kind === "movie").slice(0, 14),
      series: popular.filter((t) => t.kind === "series").slice(0, 14),
      mostWatched: [...titles].sort((a, b) => b.popularity * 0.6 + b.score * 4 - (a.popularity * 0.6 + a.score * 4)).slice(0, 14),
      awarded: titles.filter((t) => t.awarded).sort((a, b) => b.score - a.score),
      genres: GENRE_ROWS.map(([g, label]) => ({ label, items: popular.filter((t) => t.genres.includes(g)) })),
    };
  }, [titles, library, profile.preferences]);

  if (catalogStatus === "error") return <CatalogError onRetry={reloadCatalog} />;
  if (catalogStatus === "loading") {
    return (
      <>
        <HeroSkeleton />
        <div className="relative -mt-16">{[0, 1, 2].map((i) => <RowSkeleton key={i} />)}</div>
      </>
    );
  }

  return (
    <>
      <HeroBanner items={rows.hero} />
      <div className="relative z-[2] -mt-14 sm:-mt-16">
        <ContinueWatching />
        <MovieCarousel title={rows.rec.personalized ? `Recomendados para ${profile.id === "guest" ? "você" : profile.name}` : "Comece por aqui"} items={rows.rec.items} />
        <MovieCarousel title="Em alta hoje" items={rows.trending} ranked />
        <MovieCarousel title="Clássicos completos: domínio público" items={rows.fullFree} />
        <MovieCarousel title="Cinema brasileiro" items={rows.brazil} />
        <MovieCarousel title="Lançamentos recentes" items={rows.recent} />
        <MovieCarousel title="Filmes populares" items={rows.movies} />
        <MovieCarousel title="Séries populares" items={rows.series} />
        <MovieCarousel title="Os mais assistidos" items={rows.mostWatched} />
        {rows.genres.map((g) => <MovieCarousel key={g.label} title={g.label} items={g.items} />)}
        <MovieCarousel title="Animes e animações" items={rows.animation} />
        <MovieCarousel title="Produções premiadas" items={rows.awarded} />
      </div>
    </>
  );
}
