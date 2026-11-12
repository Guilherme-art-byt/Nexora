/// <reference types="vite/client" />
declare module "*.m4a" { const src: string; export default src; }

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_TMDB_ENABLED?: string;
  readonly VITE_TMDB_PROXY?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
declare module "*?raw" { const src: string; export default src; }
