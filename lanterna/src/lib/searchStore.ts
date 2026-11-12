import { useSyncExternalStore } from "react";

/** Termo de busca compartilhado entre o cabeçalho e a página de pesquisa. */
let query = "";
const listeners = new Set<() => void>();

export function setSearchQuery(q: string) {
  query = q;
  listeners.forEach((l) => l());
}

export function useSearchQuery() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => query,
  );
}
