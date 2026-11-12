import { LocalRepository } from "./localRepository";
import type { Repository } from "./repository";
import { SupabaseRepository } from "./supabaseRepository";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabase quando configurado; caso contrário, modo demonstração com dados locais. */
export const repo: Repository = url && key ? new SupabaseRepository(url, key) : new LocalRepository();

export const isDemo = repo.mode === "demo";
/**
 * TMDB disponível por um de dois caminhos (a chave nunca vai para o navegador):
 *  - "proxy": servidor próprio em /api/tmdb (Vite em dev/preview ou função da Vercel)
 *  - "supabase": Edge Function tmdb-proxy (somente administradores)
 */
export const tmdbTransport: "proxy" | "supabase" | null =
  import.meta.env.VITE_TMDB_PROXY === "true" ? "proxy"
  : repo.mode === "supabase" && import.meta.env.VITE_TMDB_ENABLED === "true" ? "supabase"
  : null;
export const tmdbEnabled = tmdbTransport !== null;
