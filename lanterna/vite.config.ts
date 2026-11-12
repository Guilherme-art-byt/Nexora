import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build`         -> build normal (dist/ com assets separados, ideal para deploy)
// `npm run build:single`  -> um único index.html autocontido (usado na versão publicada de demonstração)
export default defineConfig(({ mode }) => {
  // variáveis SEM prefixo VITE_ ficam só no servidor e nunca entram no bundle
  const env = loadEnv(mode, process.cwd(), "");

  // Proxy do TMDB: o navegador chama /api/tmdb/...; o servidor do Vite injeta a chave.
  const tmdb: Record<string, ProxyOptions> = {
    "/api/tmdb": {
      target: "https://api.themoviedb.org",
      changeOrigin: true,
      rewrite: (path) => {
        const url = new URL(path.replace(/^\/api\/tmdb/, "/3"), "http://local");
        if (env.TMDB_API_KEY && !env.TMDB_READ_TOKEN) url.searchParams.set("api_key", env.TMDB_API_KEY);
        return url.pathname + url.search;
      },
      headers: env.TMDB_READ_TOKEN ? { Authorization: `Bearer ${env.TMDB_READ_TOKEN}` } : undefined,
    },
  };

  return {
    plugins: [react(), ...(mode === "single" ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    assetsInclude: ["**/*.m4a"],
    server: { proxy: tmdb },
    preview: { proxy: tmdb },
    build: {
      target: "es2020",
      assetsInlineLimit: mode === "single" ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 6000,
    },
  };
});
