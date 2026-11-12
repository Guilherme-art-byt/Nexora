import { createZip, type ZipEntry } from "./zip";
// arquivos que a busca por padrão não alcança: arquivos ocultos e este próprio módulo
import envExample from "/.env.example?raw";
import gitignore from "/.gitignore?raw";
import selfSource from "./sourceBundle.ts?raw";

/**
 * Código-fonte completo do projeto, embutido no próprio site no momento do build.
 * Carregado só quando alguém pede o download.
 */
const TEXT: Record<string, string> = {
  ...(import.meta.glob(
    ["/src/**/*.{ts,tsx,css,json}", "/*.{json,ts,js,html,md}", "/supabase/**/*.{sql,ts}", "/api/**/*.js", "/scripts/**/*.{py,mjs}"],
    { eager: true, query: "?raw", import: "default" },
  ) as Record<string, string>),
  "/.env.example": envExample,
  "/.gitignore": gitignore,
  "/src/lib/sourceBundle.ts": selfSource,
};

// mesmas importações usadas pelo site (art.ts e player/sources.ts), para não duplicar os arquivos
const BINARY = {
  ...(import.meta.glob("/src/assets/art/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>),
  ...(import.meta.glob("/src/assets/media/*", { eager: true, import: "default" }) as Record<string, string>),
};

async function bytesOf(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const b64 = url.slice(url.indexOf(",") + 1);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao ler ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

export const SOURCE_FILE_COUNT = Object.keys(TEXT).length + Object.keys(BINARY).length;

export async function buildSourceZip(onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const enc = new TextEncoder();
  const entries: ZipEntry[] = Object.entries(TEXT)
    .filter(([path]) => !path.includes("/node_modules/"))
    .map(([path, text]) => ({ path: "lanterna" + path, data: enc.encode(text) }));
  const bins = Object.entries(BINARY);
  for (let i = 0; i < bins.length; i++) {
    const [path, url] = bins[i];
    entries.push({ path: "lanterna" + path, data: await bytesOf(url) });
    onProgress?.(i + 1, bins.length);
    if (i % 20 === 0) await new Promise((r) => setTimeout(r)); // mantém a página responsiva
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return createZip(entries);
}
