import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header, MobileNav } from "@/components/layout/Header";
import { Spinner } from "@/components/ui";
import { useRouter, type Route } from "@/lib/router";
import { ForgotPassword, Login, Register } from "@/pages/Auth";
import { NotFound, ProfilePage, ProfilesPage, SettingsPage } from "@/pages/Account";
import { KindPage, NewReleasesPage, TrendingPage } from "@/pages/Browse";
import Categories from "@/pages/Categories";
import Details from "@/pages/Details";
import Home from "@/pages/Home";
import MyList from "@/pages/MyList";
import SearchPage from "@/pages/Search";
import Watch from "@/pages/Watch";
import { useApp } from "@/store/app";

// o painel administrativo é carregado sob demanda (não pesa para o usuário comum)
const Admin = lazy(() => import("@/admin/Admin").then((m) => ({ default: m.AdminRoutes })));

const BARE = new Set(["assistir", "entrar", "cadastro", "recuperar-senha", "404"]);

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "inicio": return <Home />;
    case "filmes": return <KindPage kind="movie" />;
    case "series": return <KindPage kind="series" />;
    case "lancamentos": return <NewReleasesPage />;
    case "em-alta": return <TrendingPage />;
    case "categorias": return <Categories />;
    case "minha-lista": return <MyList />;
    case "buscar": return <SearchPage />;
    case "titulo": return <Details id={route.param!} />;
    case "assistir": return <Watch param={route.param!} />;
    case "entrar": return <Login />;
    case "cadastro": return <Register />;
    case "recuperar-senha": return <ForgotPassword />;
    case "perfil": return <ProfilePage />;
    case "perfis": return <ProfilesPage />;
    case "configuracoes": return <SettingsPage />;
    case "admin": case "admin-titulos": case "admin-usuarios": case "admin-fontes": case "editar":
      return <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Spinner size={28} /></div>}><Admin route={route} /></Suspense>;
    default: return <NotFound />;
  }
}

export default function App() {
  const { route } = useRouter();
  const { profile } = useApp();
  const bare = BARE.has(route.name);
  const reduce = profile.preferences.reduceMotion;

  useEffect(() => { document.documentElement.classList.toggle("reduce-motion", reduce); }, [reduce]);

  return (
    <MotionConfig reducedMotion={reduce ? "always" : "user"}>
      <div className="grain min-h-[100svh]">
        <a href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById("conteudo")?.focus(); }} className="sr-only z-[100] rounded-md bg-lamp px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Pular para o conteúdo
        </a>
        {!bare && <Header />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            id="conteudo"
            tabIndex={-1}
            key={route.name + (route.param ?? "")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[2] outline-none"
          >
            <Page route={route} />
          </motion.main>
        </AnimatePresence>
        {!bare && route.name !== "perfis" && <Footer />}
        {route.name !== "assistir" && <MobileNav />}
      </div>
    </MotionConfig>
  );
}
