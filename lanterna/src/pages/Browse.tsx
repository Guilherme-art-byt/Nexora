import { useMemo } from "react";
import { CatalogError } from "@/components/ErrorState";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieCarousel } from "@/components/MovieCarousel";
import { TitleGrid } from "@/components/TitleGrid";
import { GridSkeleton, HeroSkeleton, PageHeader, RowSkeleton } from "@/components/ui";
import { GENRES } from "@/data/catalog";
import { useDocumentTitle } from "@/hooks";
import { relativeTime } from "@/lib/format";
import { useApp } from "@/store/app";
import type { TitleKind } from "@/types";
import { byPopularity, byRecent } from "./Home";

/** Páginas "Filmes" e "Séries": destaque + fileiras por gênero. */
export function KindPage({ kind }: { kind: TitleKind }) {
  const label = kind === "movie" ? "Filmes" : "Séries";
  useDocumentTitle(label);
  const { titles, catalogStatus, reloadCatalog } = useApp();
  const list = useMemo(() => titles.filter((t) => t.kind === kind).sort(byPopularity), [titles, kind]);

  if (catalogStatus === "error") return <CatalogError onRetry={reloadCatalog} />;
  if (catalogStatus === "loading") return <><HeroSkeleton /><RowSkeleton /><RowSkeleton /></>;

  return (
    <>
      <HeroBanner items={list.slice(0, 4)} />
      <div className="relative z-[2] -mt-14 sm:-mt-16">
        <MovieCarousel title={`${label} em alta`} items={list.slice(0, 10)} ranked />
        <MovieCarousel title={`${label} adicionados recentemente`} items={[...list].sort(byRecent)} />
        {GENRES.map((g) => {
          const items = list.filter((t) => t.genres.includes(g));
          return items.length >= 2 ? <MovieCarousel key={g} title={g} items={items} /> : null;
        })}
        <MovieCarousel title="Melhor avaliados" items={[...list].sort((a, b) => b.score - a.score)} />
      </div>
    </>
  );
}

export function NewReleasesPage() {
  useDocumentTitle("Lançamentos");
  const { titles, catalogStatus, reloadCatalog } = useApp();
  const list = useMemo(() => [...titles].sort(byRecent), [titles]);
  const recent = list.filter((t) => Date.now() - new Date(t.addedAt).getTime() < 30 * 86400_000);
  if (catalogStatus === "error") return <CatalogError onRetry={reloadCatalog} />;
  return (
    <>
      <PageHeader title="Lançamentos" description="Os títulos que chegaram por último ao catálogo, do mais novo para o mais antigo." />
      {catalogStatus === "loading" ? <GridSkeleton /> : (
        <>
          {recent.length > 0 && (
            <section className="mb-12" aria-label="Chegaram este mês">
              <h2 className="page-x mb-4 font-display text-3xl font-bold">Chegaram este mês</h2>
              <ul className="page-x grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <a href={`#titulo-${t.id}`} className="group relative block aspect-video overflow-hidden rounded-xl border border-line/60">
                      <img src={t.backdrop} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <span className="absolute bottom-3 left-4 right-4">
                        <span className="block text-xs font-semibold text-lamp">Adicionado {relativeTime(t.addedAt)}</span>
                        <span className="block font-display text-3xl font-extrabold leading-none">{t.title}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <h2 className="page-x mb-4 font-display text-3xl font-bold">Todo o catálogo por data de chegada</h2>
          <TitleGrid items={list} />
        </>
      )}
    </>
  );
}

export function TrendingPage() {
  useDocumentTitle("Em alta");
  const { titles, catalogStatus, reloadCatalog } = useApp();
  const list = useMemo(() => [...titles].sort(byPopularity), [titles]);
  if (catalogStatus === "error") return <CatalogError onRetry={reloadCatalog} />;
  return (
    <>
      <PageHeader title="Em alta" description="O que mais está sendo assistido agora. Os dez primeiros recebem a posição no ranking." />
      {catalogStatus === "loading" ? <GridSkeleton /> : <TitleGrid items={list} ranked />}
    </>
  );
}
