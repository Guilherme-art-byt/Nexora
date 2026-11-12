/**
 * Busca no TMDB as capas oficiais (pôster, fundo e miniaturas de episódios) de todos os
 * títulos do catálogo e grava os endereços em src/data/covers.json.
 *
 * O app só guarda os ENDEREÇOS das imagens (servidas por image.tmdb.org); nenhuma imagem
 * é copiada para o projeto e o navegador não precisa de chave para exibi-las.
 *
 * Uso (precisa do "Token de Leitura da API" do TMDB, o longo que começa com eyJ):
 *   TMDB_READ_TOKEN=eyJ... node scripts/fetch-covers.mjs
 *   node scripts/fetch-covers.mjs --only=matrix,dark   # refaz só alguns títulos
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "src/data/covers.json");
const API = "https://api.themoviedb.org/3";
const TOKEN = process.env.TMDB_READ_TOKEN ?? "";
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

// ------------------------------------------------------------ carrega o catálogo (TypeScript)
async function loadCatalog() {
  const res = await build({
    entryPoints: [resolve(root, "src/data/catalog.ts")],
    bundle: true, write: false, format: "esm", platform: "node",
    alias: { "@": resolve(root, "src") },
    plugins: [{
      name: "stub-art",
      setup(b) {
        b.onResolve({ filter: /^\.\/(art|covers\.json)$/ }, (a) => ({ path: a.path, namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const art = () => ''; export const cover = () => undefined; export default {};", loader: "js" }));
      },
    }],
  });
  const code = res.outputFiles[0].text;
  const mod = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
  return mod.DEMO_TITLES;
}

// ------------------------------------------------------------ TMDB
async function call(path, params = {}) {
  const qs = new URLSearchParams({ language: "pt-BR", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${API}${path}?${qs}`, { headers: { Authorization: `Bearer ${TOKEN || "proxy-injected"}`, accept: "application/json" } });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1))); continue; }
    if (!r.ok) throw new Error(`${r.status} em ${path}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error(`TMDB limitou as chamadas em ${path}`);
}

const norm = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function findId(t, kindOverride) {
  const isTv = (kindOverride ?? t.kind) === "series";
  const kind = isTv ? "tv" : "movie";
  const yearKey = isTv ? "first_air_date_year" : "primary_release_year";
  const names = [...new Set([t.originalTitle, t.title].filter(Boolean))];
  for (const query of names) {
    for (const params of [{ [yearKey]: String(t.year) }, {}]) {
      const { results = [] } = await call(`/search/${kind}`, { query, ...params });
      if (!results.length) continue;
      const year = (r) => Number((r.release_date ?? r.first_air_date ?? "").slice(0, 4));
      const scored = results.slice(0, 10).map((r) => {
        let s = 0;
        const n = [r.title, r.name, r.original_title, r.original_name].map(norm);
        if (names.some((x) => n.includes(norm(x)))) s += 10;
        const dy = Math.abs(year(r) - t.year);
        s += dy === 0 ? 8 : dy === 1 ? 5 : dy <= 2 ? 1 : -10;
        s += Math.min(5, Math.log10(1 + (r.vote_count ?? 0)));
        return { r, s };
      }).sort((a, b) => b.s - a.s);
      if (scored[0].s >= 8) return scored[0].r.id;
    }
  }
  return null;
}

/** Prefere pôster em português; senão o pôster original. Fundo sem texto quando houver. */
function pick(images, lang) {
  const best = (arr) => [...arr].sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)[0]?.file_path;
  const posters = images?.posters ?? [];
  const backdrops = images?.backdrops ?? [];
  return {
    poster: best(posters.filter((p) => p.iso_639_1 === "pt")) ?? best(posters.filter((p) => p.iso_639_1 === lang)),
    backdrop: best(backdrops.filter((b) => b.iso_639_1 === null)) ?? best(backdrops),
  };
}

async function movieArt(id) {
  const d = await call(`/movie/${id}`, { append_to_response: "images", include_image_language: "pt,en,null" });
  const p = pick(d.images, d.original_language === "pt" ? "pt" : "en");
  return { title: d.title, poster: p.poster ?? d.poster_path ?? undefined, backdrop: p.backdrop ?? d.backdrop_path ?? undefined };
}

/**
 * Séries que o TMDB cadastra como filmes avulsos (curtas clássicos): cada episódio com
 * `originalTitle` é procurado como filme. A capa da série vem do primeiro episódio e cada
 * episódio ganha o fundo (ou pôster) do próprio curta como miniatura.
 */
async function resolveFromEpisodes(t) {
  const eps = (t.seasons ?? []).flatMap((s) => s.episodes.map((e) => ({ e, year: s.year })));
  if (!eps.length || !eps.every(({ e }) => e.originalTitle)) return null;
  const entry = { stills: {} };
  for (const { e, year } of eps) {
    const id = await findId({ kind: "movie", title: e.title, originalTitle: e.originalTitle, year }, "movie");
    if (!id) continue;
    const a = await movieArt(id);
    if (!entry.poster && a.poster) { entry.poster = a.poster; entry.backdrop = a.backdrop; entry.tmdbTitle = `${a.title} (episódio)`; }
    const still = a.backdrop ?? a.poster;
    if (still) entry.stills[e.id] = still;
  }
  return entry.poster ? entry : null;
}

async function resolveTitle(t) {
  const id = await findId(t);
  if (!id) return t.kind === "series" ? resolveFromEpisodes(t) : null;
  const isTv = t.kind === "series";
  const d = await call(`/${isTv ? "tv" : "movie"}/${id}`, { append_to_response: "images", include_image_language: "pt,en,null" });
  const p = pick(d.images, d.original_language === "pt" ? "pt" : "en");
  const entry = {
    tmdbId: id,
    tmdbTitle: d.title ?? d.name,
    poster: p.poster ?? d.poster_path ?? undefined,
    backdrop: p.backdrop ?? d.backdrop_path ?? undefined,
  };
  if (isTv && t.seasons?.length) {
    entry.stills = {};
    for (const s of t.seasons) {
      const season = await call(`/tv/${id}/season/${s.number}`).catch(() => null);
      for (const e of season?.episodes ?? []) {
        const ep = s.episodes.find((x) => x.number === e.episode_number);
        if (ep && e.still_path) entry.stills[ep.id] = e.still_path;
      }
    }
  }
  return entry;
}

// ------------------------------------------------------------ execução
const titles = await loadCatalog();
if (!titles?.length) throw new Error("Não encontrei a lista de títulos exportada por src/data/catalog.ts");
const covers = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = titles.filter((t) => (only.length ? only.includes(t.id) : true));
const missing = [];

for (let i = 0; i < todo.length; i += 4) {
  await Promise.all(todo.slice(i, i + 4).map(async (t) => {
    try {
      const c = await resolveTitle(t);
      if (c) { covers[t.id] = c; console.log(`ok   ${t.id} -> ${c.tmdbTitle} (${c.tmdbId})`); }
      else { missing.push(t.id); console.log(`---  ${t.id}: não encontrado`); }
    } catch (e) {
      missing.push(t.id);
      console.log(`ERRO ${t.id}: ${e.message}`);
    }
  }));
}

const sorted = Object.fromEntries(Object.keys(covers).sort().map((k) => [k, covers[k]]));
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`\n${Object.keys(sorted).length}/${titles.length} títulos com capa oficial em src/data/covers.json`);
if (missing.length) console.log("Sem capa:", missing.join(", "));
