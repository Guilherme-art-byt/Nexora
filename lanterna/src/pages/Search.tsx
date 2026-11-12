import { Clock, SearchX, Trash2, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { TitleGrid } from "@/components/TitleGrid";
import { EmptyState } from "@/components/ui";
import { GENRES } from "@/data/catalog";
import { useDebounced, useDocumentTitle } from "@/hooks";
import { normalize } from "@/lib/format";
import { setSearchQuery, useSearchQuery } from "@/lib/searchStore";
import { searchTitles } from "@/services/search";
import { useApp } from "@/store/app";

export default function SearchPage() {
  useDocumentTitle("Pesquisar");
  const query = useSearchQuery();
  const q = useDebounced(query, 160);
  const { titles, searchHistory, clearSearchHistory, pushSearch } = useApp();
  const results = useMemo(() => searchTitles(titles, q), [titles, q]);
  const people = useMemo(() => {
    const n = normalize(q);
    if (n.length < 2) return [];
    const set = new Set<string>();
    titles.forEach((t) => [...t.cast.map((c) => c.name), ...t.directors].forEach((p) => normalize(p).includes(n) && set.add(p)));
    return [...set].slice(0, 8);
  }, [titles, q]);

  // registra no histórico a busca que o usuário "parou" de digitar
  const settled = useDebounced(query, 1500);
  useEffect(() => { if (settled.trim().length >= 2 && results.length) pushSearch(settled); }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps

  const popular = useMemo(() => [...titles].sort((a, b) => b.popularity - a.popularity).slice(0, 12), [titles]);

  return (
    <div className="pt-24 sm:pt-28">
      <div className="page-x mb-8 max-w-3xl">
        <h1 className="display mb-5 text-5xl sm:text-6xl">Pesquisar</h1>
        <SearchBar variant="page" autoFocus />
      </div>

      {!q.trim() ? (
        <>
          {searchHistory.length > 0 && (
            <section className="page-x mb-10 max-w-3xl" aria-label="Pesquisas recentes">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Pesquisas recentes</h2>
                <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-lamp hover:bg-lamp/10" onClick={clearSearchHistory}>
                  <Trash2 size={15} /> Limpar histórico
                </button>
              </div>
              <ul className="flex flex-wrap gap-2">
                {searchHistory.map((h) => (
                  <li key={h}><button className="chip" onClick={() => setSearchQuery(h)}><Clock size={14} className="text-mute" /> {h}</button></li>
                ))}
              </ul>
            </section>
          )}
          <section className="page-x mb-10" aria-label="Explorar por gênero">
            <h2 className="mb-3 text-lg font-bold">Explorar por gênero</h2>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => <button key={g} className="chip" onClick={() => setSearchQuery(g)}>{g}</button>)}
            </div>
          </section>
          <h2 className="page-x mb-4 text-lg font-bold">Mais buscados</h2>
          <TitleGrid items={popular} />
        </>
      ) : results.length ? (
        <>
          <p className="page-x mb-4 text-sm text-mute" aria-live="polite">
            {results.length === 1 ? "1 resultado" : `${results.length} resultados`} para <span className="font-semibold text-paper">“{q.trim()}”</span>
          </p>
          {people.length > 0 && (
            <div className="page-x mb-6 flex flex-wrap gap-2">
              {people.map((p) => <button key={p} className="chip" onClick={() => setSearchQuery(p)}>{p}</button>)}
            </div>
          )}
          <TitleGrid items={results} />
        </>
      ) : (
        <EmptyState
          icon={<SearchX size={28} />}
          title={`Nada encontrado para “${q.trim()}”`}
          body="Confira a grafia ou tente o nome de um ator, diretor ou gênero."
          action={<button className="btn-glass" onClick={() => setSearchQuery("")}><X size={16} /> Limpar pesquisa</button>}
        />
      )}
    </div>
  );
}
