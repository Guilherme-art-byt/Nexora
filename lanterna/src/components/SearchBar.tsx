import { AnimatePresence, motion } from "framer-motion";
import { Clock, Film, Search, Tag, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounced } from "@/hooks";
import { useRouter } from "@/lib/router";
import { setSearchQuery, useSearchQuery } from "@/lib/searchStore";
import { suggestions as buildSuggestions, type SearchSuggestion } from "@/services/search";
import { useApp } from "@/store/app";

interface Props {
  variant: "header" | "page";
  autoFocus?: boolean;
}

export function SearchBar({ variant, autoFocus }: Props) {
  const query = useSearchQuery();
  const { titles, searchHistory, pushSearch, clearSearchHistory } = useApp();
  const { route, navigate } = useRouter();
  const [expanded, setExpanded] = useState(variant === "page");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query, 120);

  const sugg = useMemo(() => buildSuggestions(titles, debounced), [titles, debounced]);
  const showHistory = focused && !query && searchHistory.length > 0;
  const showSugg = focused && query.length >= 2 && sugg.length > 0 && !(variant === "page");
  const items: SearchSuggestion[] = showHistory ? searchHistory.map((h) => ({ type: "title", label: h, sub: "history" })) : showSugg ? sugg : [];

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => setActive(-1), [debounced, focused]);

  useEffect(() => {
    if (variant !== "header" || !expanded) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node) && !query) setExpanded(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expanded, query, variant]);

  const goSearch = (q: string) => {
    setSearchQuery(q);
    pushSearch(q);
    if (route.name !== "buscar") navigate("buscar");
    input.current?.blur();
  };

  const pick = (s: SearchSuggestion) => {
    if (s.sub === "history") return goSearch(s.label);
    if (s.type === "title" && s.titleId) {
      pushSearch(s.label);
      setFocused(false);
      return navigate("titulo", s.titleId);
    }
    goSearch(s.label);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === "Enter") {
      if (active >= 0 && items[active]) pick(items[active]);
      else if (query.trim()) goSearch(query);
    } else if (e.key === "Escape") {
      if (query) setSearchQuery("");
      else { input.current?.blur(); if (variant === "header") setExpanded(false); }
    }
  };

  const onChange = (v: string) => {
    setSearchQuery(v);
    if (variant === "header" && v.length >= 2 && route.name !== "buscar") {
      // pesquisa em tempo real: abre a página de resultados enquanto digita
      navigate("buscar");
    }
  };

  if (variant === "header" && !expanded) {
    return (
      <button className="grid h-11 w-11 place-items-center rounded-full text-paper hover:bg-paper/10" onClick={() => { setExpanded(true); setTimeout(() => input.current?.focus(), 30); }} aria-label="Pesquisar">
        <Search size={21} />
      </button>
    );
  }

  const big = variant === "page";

  return (
    <div ref={wrap} className={`relative ${big ? "w-full" : ""}`}>
      <motion.div
        initial={variant === "header" ? { width: 44, opacity: 0.6 } : false}
        animate={{ width: big ? "100%" : 280, opacity: 1 }}
        transition={{ duration: 0.22 }}
        className={`flex items-center gap-2 rounded-xl border ${focused ? "border-lamp/60" : "border-paper/20"} ${big ? "h-14 bg-surface px-4" : "h-11 bg-ink/70 px-3 backdrop-blur-md"}`}
      >
        <Search size={big ? 22 : 18} className="shrink-0 text-mute" aria-hidden />
        <input
          ref={input}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 140)}
          onKeyDown={onKey}
          placeholder="Títulos, pessoas, gêneros"
          aria-label="Pesquisar títulos, pessoas e gêneros"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={`sugg-${variant}`}
          aria-activedescendant={active >= 0 ? `sugg-${variant}-${active}` : undefined}
          className={`min-w-0 flex-1 bg-transparent text-paper placeholder:text-mute/70 focus:outline-none ${big ? "text-lg" : "text-sm"}`}
          enterKeyHint="search"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => { setSearchQuery(""); input.current?.focus(); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-paper/10 hover:text-paper" aria-label="Limpar pesquisa">
            <X size={16} />
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {items.length > 0 && (
          <motion.ul
            id={`sugg-${variant}`}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute z-50 mt-2 w-full min-w-[280px] overflow-hidden rounded-xl border border-line bg-surface/95 py-1.5 shadow-2xl backdrop-blur-xl ${big ? "" : "right-0"}`}
          >
            {showHistory && (
              <li className="flex items-center justify-between px-4 pb-1 pt-1.5 text-xs font-semibold text-mute">
                Pesquisas recentes
                <button onMouseDown={(e) => e.preventDefault()} onClick={clearSearchHistory} className="rounded px-1.5 py-0.5 text-lamp hover:bg-lamp/10">Limpar histórico</button>
              </li>
            )}
            {items.map((s, i) => (
              <li key={`${s.type}-${s.label}-${i}`} id={`sugg-${variant}-${i}`} role="option" aria-selected={i === active}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? "bg-paper/10" : ""}`}
                >
                  <span className="text-mute">
                    {s.sub === "history" ? <Clock size={15} /> : s.type === "person" ? <User size={15} /> : s.type === "genre" ? <Tag size={15} /> : <Film size={15} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-paper">{s.label}</span>
                  {s.sub && s.sub !== "history" && <span className="shrink-0 text-xs text-mute">{s.sub}</span>}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
