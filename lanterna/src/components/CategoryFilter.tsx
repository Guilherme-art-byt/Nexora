import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { GENRES } from "@/data/catalog";
import type { SortOption } from "@/types";

export interface Filters {
  kind: "all" | "movie" | "series";
  genres: string[];
  decade: string; // "all" | "2020" | "2010"...
  minScore: number;
  sort: SortOption["value"];
}

export const DEFAULT_FILTERS: Filters = { kind: "all", genres: [], decade: "all", minScore: 0, sort: "popular" };

const SORTS: SortOption[] = [
  { value: "popular", label: "Mais populares" },
  { value: "recent", label: "Mais recentes" },
  { value: "score", label: "Melhor avaliados" },
  { value: "year", label: "Ano de lançamento" },
  { value: "az", label: "Ordem alfabética" },
];

export function CategoryFilter({ value, onChange, years, total }: { value: Filters; onChange: (f: Filters) => void; years: number[]; total: number }) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const active = (value.kind !== "all" ? 1 : 0) + value.genres.length + (value.decade !== "all" ? 1 : 0) + (value.minScore ? 1 : 0);
  const decades = [...new Set(years.map((y) => String(Math.floor(y / 10) * 10)))].sort().reverse();
  const toggleGenre = (g: string) => set({ genres: value.genres.includes(g) ? value.genres.filter((x) => x !== g) : [...value.genres, g] });

  const panel = (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">Gêneros</legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button key={g} onClick={() => toggleGenre(g)} aria-pressed={value.genres.includes(g)} className={`chip ${value.genres.includes(g) ? "chip-on" : ""}`}>{g}</button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="label">Ano</span>
          <select className="field" value={value.decade} onChange={(e) => set({ decade: e.target.value })}>
            <option value="all">Todos os anos</option>
            {years.map((y) => <option key={y} value={`y${y}`}>{y}</option>)}
            {decades.map((d) => <option key={d} value={d}>Década de {d}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Avaliação mínima</span>
          <select className="field" value={value.minScore} onChange={(e) => set({ minScore: Number(e.target.value) })}>
            <option value={0}>Qualquer nota</option>
            {[6, 7, 8, 9].map((n) => <option key={n} value={n}>Nota {n} ou mais</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Ordenar por</span>
          <select className="field" value={value.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <div className="page-x mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Tipo" className="flex rounded-full border border-line bg-surface p-1">
          {([["all", "Tudo"], ["movie", "Filmes"], ["series", "Séries"]] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={value.kind === k} onClick={() => set({ kind: k })} className={`min-h-[36px] rounded-full px-4 text-sm font-semibold transition ${value.kind === k ? "bg-paper text-ink" : "text-paper/75 hover:text-paper"}`}>{l}</button>
          ))}
        </div>
        <button className={`chip ${open ? "chip-on" : ""}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="filters-panel">
          <SlidersHorizontal size={16} /> Filtros{active ? ` (${active})` : ""}
        </button>
        {active > 0 && (
          <button className="chip" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: value.sort })}><RotateCcw size={15} /> Limpar filtros</button>
        )}
        <p className="ml-auto text-sm text-mute" aria-live="polite">{total === 1 ? "1 título" : `${total} títulos`}</p>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id="filters-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="card-surface mt-4 p-5">{panel}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
