import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/lib/router";
import { useApp } from "@/store/app";
import type { Title } from "@/types";

export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

export function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

/** true em dispositivos com mouse (hover real); false em telas de toque. */
export const useCanHover = () => useMediaQuery("(hover: hover) and (pointer: fine)");

export function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Ações comuns de um título: abrir detalhes e reproduzir (retomando onde parou). */
export function useTitleActions() {
  const { navigate } = useRouter();
  const { library } = useApp();
  const open = useCallback((t: Title) => navigate("titulo", t.id), [navigate]);
  const play = useCallback((t: Title, episodeId?: string) => {
    if (episodeId) return navigate("assistir", episodeId);
    if (t.kind === "series") {
      const p = library.progress.find((x) => x.titleId === t.id);
      let ep = p?.episodeId ?? t.seasons?.[0]?.episodes[0]?.id;
      if (p?.finished && p.episodeId) ep = nextEpisode(t, p.episodeId)?.id ?? ep;
      return navigate("assistir", ep ?? t.id);
    }
    navigate("assistir", t.id);
  }, [library.progress, navigate]);
  return { open, play };
}

/** Resolve "assistir-<id>": id de filme ou de episódio. */
export function resolvePlayable(titles: Title[], param: string) {
  for (const t of titles) {
    if (t.id === param) {
      if (t.kind === "movie") return { title: t };
      const s = t.seasons?.[0];
      return { title: t, season: s, episode: s?.episodes[0] };
    }
    for (const s of t.seasons ?? []) {
      const e = s.episodes.find((x) => x.id === param);
      if (e) return { title: t, season: s, episode: e };
    }
  }
  return null;
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Lanterna` : "Lanterna — filmes e séries";
  }, [title]);
}

export function nextEpisode(t: Title, episodeId: string) {
  const all = (t.seasons ?? []).flatMap((s) => s.episodes.map((e) => ({ e, season: s.number })));
  const i = all.findIndex((x) => x.e.id === episodeId);
  return i >= 0 && i < all.length - 1 ? { ...all[i + 1].e, season: all[i + 1].season } : undefined;
}
