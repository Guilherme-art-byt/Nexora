import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryFilter, DEFAULT_FILTERS, type Filters } from "@/components/CategoryFilter";
import { CatalogError } from "@/components/ErrorState";
import { TitleGrid } from "@/components/TitleGrid";
import { EmptyState, GridSkeleton, PageHeader } from "@/components/ui";
import { GENRES } from "@/data/catalog";
import { useDocumentTitle } from "@/hooks";
import { load, save } from "@/lib/storage";
import { useApp } from "@/store/app";
import type { Title } from "@/types";

export function applyFilters(titles: Title[], f: Filters) {
  let list = titles.filter((t) =>
    (f.kind === "all" || t.kind === f.kind) &&
    f.genres.every((g) => t.genres.includes(g)) &&
    (f.decade === "all" || (f.decade.startsWith("y") ? t.year === Number(f.decade.slice(1)) : Math.floor(t.year / 10) * 10 === Number(f.decade))) &&
    t.score >= f.minScore,
  );
  const sorters: Record<Filters["sort"], (a: Title, b: Title) => number> = {
    popular: (a, b) => b.popularity - a.popularity,
    recent: (a, b) => b.addedAt.localeCompare(a.addedAt),
    score: (a, b) => b.score - a.score,
    year: (a, b) => b.year - a.year || b.popularity - a.popularity,
    az: (a, b) => a.title.localeCompare(b.title, "pt-BR"),
  };
  list = [...list].sort(sorters[f.sort]);
  return list;
}

export default function Categories() {
  useDocumentTitle("Categorias");
  const { titles, catalogStatus, reloadCatalog } = useApp();
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...load<Partial<Filters>>("explore-filters", {}) }));
  const update = (f: Filters) => { setFilters(f); save("explore-filters", f); };
  const years = useMemo(() => [...new Set(titles.map((t) => t.year))].sort((a, b) => b - a), [titles]);
  const list = useMemo(() => applyFilters(titles, filters), [titles, filters]);
  const counts = useMemo(() => Object.fromEntries(GENRES.map((g) => [g, titles.filter((t) => t.genres.includes(g)).length])), [titles]);

  if (catalogStatus === "error") return <CatalogError onRetry={reloadCatalog} />;

  return (
    <>
      <PageHeader title="Categorias" description="Combine gênero, ano, nota e tipo para encontrar exatamente o que você quer ver.">
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          {GENRES.map((g) => {
            const on = filters.genres.length === 1 && filters.genres[0] === g;
            return (
              <button key={g} onClick={() => update({ ...filters, genres: on ? [] : [g] })} aria-pressed={on} className={`chip shrink-0 ${on ? "chip-on" : ""}`}>
                {g} <span className="text-xs text-mute">{counts[g]}</span>
              </button>
            );
          })}
        </div>
      </PageHeader>
      <CategoryFilter value={filters} onChange={update} years={years} total={list.length} />
      {catalogStatus === "loading" ? <GridSkeleton /> : list.length ? <TitleGrid items={list} /> : (
        <EmptyState
          icon={<SearchX size={28} />}
          title="Nenhum título com esses filtros"
          body="Tente remover um gênero ou baixar a nota mínima."
          action={<button className="btn-primary" onClick={() => update(DEFAULT_FILTERS)}>Limpar filtros</button>}
        />
      )}
    </>
  );
}
