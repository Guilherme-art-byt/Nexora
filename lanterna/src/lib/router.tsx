import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Roteador por hash com nomes simples (#filmes, #titulo-orbita-baixa).
 * Usa apenas letras, números e hífens, o que funciona tanto em hospedagem comum
 * quanto dentro de páginas publicadas em ambientes que só repassam "#nome".
 */
export const STATIC_ROUTES = [
  "inicio", "filmes", "series", "lancamentos", "em-alta", "categorias", "minha-lista", "buscar",
  "perfil", "entrar", "cadastro", "recuperar-senha", "configuracoes", "perfis",
  "admin", "admin-titulos", "admin-usuarios", "admin-fontes",
] as const;
export const PARAM_ROUTES = ["titulo", "assistir", "editar"] as const;

export type RouteName = (typeof STATIC_ROUTES)[number] | (typeof PARAM_ROUTES)[number] | "404";
export interface Route { name: RouteName; param?: string }

export function parseHash(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#/, "")).trim();
  if (!h) return { name: "inicio" };
  // retorno do e-mail de recuperação do Supabase (#access_token=...&type=recovery)
  if (h.includes("type=recovery")) return { name: "recuperar-senha" };
  if (h.includes("access_token=")) return { name: "inicio" };
  if ((STATIC_ROUTES as readonly string[]).includes(h)) return { name: h as RouteName };
  for (const p of PARAM_ROUTES) {
    if (h.startsWith(p + "-") && h.length > p.length + 1) return { name: p, param: h.slice(p.length + 1) };
  }
  return { name: "404", param: h };
}

export function toHash(name: RouteName, param?: string) {
  return "#" + (param ? `${name}-${param}` : name);
}

interface RouterCtx {
  route: Route;
  navigate: (name: RouteName, param?: string, opts?: { replace?: boolean }) => void;
  back: () => void;
}

const Ctx = createContext<RouterCtx | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback<RouterCtx["navigate"]>((name, param, opts) => {
    const hash = toHash(name, param);
    if (hash === location.hash || (hash === "#inicio" && !location.hash)) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (opts?.replace) {
      history.replaceState(null, "", hash);
      setRoute(parseHash(hash));
      window.scrollTo({ top: 0 });
    } else {
      location.hash = hash;
    }
  }, []);

  const back = useCallback(() => {
    if (history.length > 1) history.back();
    else navigate("inicio");
  }, [navigate]);

  const value = useMemo(() => ({ route, navigate, back }), [route, navigate, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRouter() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRouter fora do RouterProvider");
  return c;
}
