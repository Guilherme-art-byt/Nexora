// Supabase Edge Function: proxy para a API do TMDB.
// A chave fica guardada como segredo do projeto e nunca chega ao navegador.
//   supabase secrets set TMDB_API_KEY=sua_chave_v3      (ou TMDB_READ_TOKEN=seu_token_v4)
//   supabase functions deploy tmdb-proxy
// Somente administradores autenticados podem usar (impede uso da sua cota por terceiros).

import { createClient } from "jsr:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// apenas rotas de leitura de metadados
const ALLOWED = [/^\/search\/(multi|movie|tv)$/, /^\/(movie|tv)\/\d+$/, /^\/tv\/\d+\/season\/\d+$/];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return json({ error: "Somente administradores." }, 403);

    const { path, params } = await req.json() as { path: string; params?: Record<string, string> };
    if (!ALLOWED.some((r) => r.test(path))) return json({ error: "Rota não permitida." }, 400);

    const url = new URL("https://api.themoviedb.org/3" + path);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));

    const token = Deno.env.get("TMDB_READ_TOKEN");
    const key = Deno.env.get("TMDB_API_KEY");
    if (!token && !key) return json({ error: "Configure TMDB_API_KEY ou TMDB_READ_TOKEN." }, 500);
    if (!token) url.searchParams.set("api_key", key!);

    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return json(await res.json(), res.status);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
