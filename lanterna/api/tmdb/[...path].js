// Função serverless da Vercel: proxy do TMDB para produção.
// Configure TMDB_API_KEY (ou TMDB_READ_TOKEN) e VITE_TMDB_PROXY=true nas variáveis do projeto na Vercel.
// O navegador chama /api/tmdb/<rota>; a chave fica somente aqui.

const ALLOWED = [/^search\/(multi|movie|tv)$/, /^(movie|tv)\/\d+$/, /^tv\/\d+\/season\/\d+$/];

export default async function handler(req, res) {
  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!ALLOWED.some((r) => r.test(path))) return res.status(400).json({ error: "Rota não permitida." });

  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [k, v] of Object.entries(req.query)) if (k !== "path") url.searchParams.set(k, String(v));

  const token = process.env.TMDB_READ_TOKEN;
  if (!token) url.searchParams.set("api_key", process.env.TMDB_API_KEY || "");

  const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  res.status(r.status).json(await r.json());
}
