import { AnimatePresence, motion } from "framer-motion";
import { Bell, Clapperboard, Flame, Grid3x3, Home, LayoutDashboard, LogIn, LogOut, Menu, Search, Settings, Sparkles, Tv, User, Users, X, Bookmark } from "lucide-react";
import { useCallback, useState } from "react";
import { useScrolled } from "@/hooks";
import { relativeTime } from "@/lib/format";
import { useRouter, type RouteName } from "@/lib/router";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import { SearchBar } from "../SearchBar";
import { SourceDownloadButton } from "../SourceDownloadButton";
import { Avatar, Logo } from "../ui";
import { Dropdown } from "../ui/Dropdown";

const NAV: { name: RouteName; label: string }[] = [
  { name: "inicio", label: "Início" },
  { name: "series", label: "Séries" },
  { name: "filmes", label: "Filmes" },
  { name: "categorias", label: "Categorias" },
  { name: "minha-lista", label: "Minha Lista" },
  { name: "em-alta", label: "Em Alta" },
];

export function Header() {
  const scrolled = useScrolled(30);
  const { route, navigate } = useRouter();
  const { account } = useApp();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "bg-ink/90 shadow-[0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl" : "bg-gradient-to-b from-ink/80 to-transparent"
      }`}
    >
      <div className="page-x flex h-16 items-center gap-4 lg:h-[72px] lg:gap-8">
        <a href="#inicio" onClick={(e) => { e.preventDefault(); navigate("inicio"); }} className="shrink-0 rounded-md" aria-label="Lanterna, página inicial">
          <Logo />
        </a>
        <nav className="hidden lg:block" aria-label="Principal">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = route.name === n.name;
              return (
                <li key={n.name}>
                  <a
                    href={`#${n.name}`}
                    onClick={(e) => { e.preventDefault(); navigate(n.name); }}
                    aria-current={active ? "page" : undefined}
                    className={`relative rounded-md px-3 py-2 text-[14px] font-semibold transition-colors ${active ? "text-paper" : "text-paper/65 hover:text-paper"}`}
                  >
                    {n.label}
                    {active && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-lamp" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block"><SearchBar variant="header" /></div>
          <button className="grid h-11 w-11 place-items-center rounded-full text-paper hover:bg-paper/10 md:hidden" onClick={() => navigate("buscar")} aria-label="Pesquisar">
            <Search size={21} />
          </button>
          <Notifications />
          {account ? (
            <ProfileMenu />
          ) : (
            <>
              <button className="btn-primary hidden min-h-[40px] px-4 sm:inline-flex" onClick={() => navigate("entrar")}>
                <LogIn size={17} /> Entrar
              </button>
              <ProfileMenu />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const { notifications, markAllRead } = useApp();
  const { navigate } = useRouter();
  const unread = notifications.filter((n) => !n.read).length;
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dropdown
      open={open}
      onClose={close}
      label="Notificações"
      className="w-[min(360px,calc(100vw-24px))] -right-14 sm:right-0"
      anchor={
        <button
          className="relative grid h-11 w-11 place-items-center rounded-full text-paper hover:bg-paper/10"
          onClick={() => { setOpen((v) => !v); if (!open) setTimeout(markAllRead, 1500); }}
          aria-label={unread ? `Notificações, ${unread} novas` : "Notificações"}
          aria-expanded={open}
        >
          <Bell size={21} />
          {unread > 0 && <span className="absolute right-2 top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lamp px-1 text-[10px] font-extrabold text-ink">{unread}</span>}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-bold">Novidades</p>
        {unread > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-lamp hover:underline">Marcar todas como lidas</button>}
      </div>
      {notifications.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-mute">Nenhuma novidade por enquanto. Avisaremos quando chegarem títulos novos.</p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                role="menuitem"
                onClick={() => { setOpen(false); if (n.titleId) navigate("titulo", n.titleId); }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-paper/5"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-lamp"}`} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">{n.body}</span>
                  <span className="block text-xs text-mute">{n.title}, {relativeTime(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { account, profile, profiles, selectProfile, signOut } = useApp();
  const { navigate } = useRouter();
  const { toast } = useUI();
  const close = useCallback(() => setOpen(false), []);
  const go = (name: RouteName) => { setOpen(false); navigate(name); };

  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-paper/85 hover:bg-paper/5 hover:text-paper";

  return (
    <Dropdown
      open={open}
      onClose={close}
      label="Menu do perfil"
      className="w-64"
      anchor={
        <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-paper/10" onClick={() => setOpen((v) => !v)} aria-label={`Perfil ${profile.name}. Abrir menu`} aria-expanded={open}>
          <Avatar profile={profile} size={34} />
        </button>
      }
    >
      {account ? (
        <>
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-bold">{account.name}</p>
            <p className="truncate text-xs text-mute">{account.email}</p>
          </div>
          <ul className="border-b border-line py-1.5">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  role="menuitemradio"
                  aria-checked={p.id === profile.id}
                  className={item}
                  onClick={() => { selectProfile(p.id); setOpen(false); if (p.id !== profile.id) toast(`Perfil ${p.name} ativo`, "info"); }}
                >
                  <Avatar profile={p} size={28} />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === profile.id && <span className="h-2 w-2 rounded-full bg-lamp" aria-hidden />}
                </button>
              </li>
            ))}
            <li><button className={item} onClick={() => go("perfis")}><Users size={18} /> Gerenciar perfis</button></li>
          </ul>
          <ul className="py-1.5">
            <li><button className={item} onClick={() => go("perfil")}><User size={18} /> Minha conta</button></li>
            <li><button className={item} onClick={() => go("configuracoes")}><Settings size={18} /> Configurações</button></li>
            {account.role === "admin" && <li><button className={item} onClick={() => go("admin")}><LayoutDashboard size={18} /> Painel administrativo</button></li>}
            <li>
              <button className={item} onClick={async () => { setOpen(false); await signOut(); toast("Você saiu da sua conta.", "info"); navigate("inicio"); }}>
                <LogOut size={18} /> Sair
              </button>
            </li>
          </ul>
        </>
      ) : (
        <div className="p-4">
          <p className="text-sm font-bold">Você está como visitante</p>
          <p className="mt-1 text-xs leading-relaxed text-mute">Sua lista fica salva neste aparelho. Entre para sincronizar e criar perfis.</p>
          <div className="mt-4 grid gap-2">
            <button className="btn-primary" onClick={() => go("entrar")}>Entrar</button>
            <button className="btn-glass" onClick={() => go("cadastro")}>Criar conta</button>
            <button className={`${item} !px-0`} onClick={() => go("configuracoes")}><Settings size={18} /> Configurações</button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

const TABS: { name: RouteName; label: string; icon: typeof Home }[] = [
  { name: "inicio", label: "Início", icon: Home },
  { name: "buscar", label: "Buscar", icon: Search },
  { name: "em-alta", label: "Em alta", icon: Flame },
  { name: "minha-lista", label: "Minha Lista", icon: Bookmark },
];

const MORE: { name: RouteName; label: string; icon: typeof Home }[] = [
  { name: "filmes", label: "Filmes", icon: Clapperboard },
  { name: "series", label: "Séries", icon: Tv },
  { name: "lancamentos", label: "Lançamentos", icon: Sparkles },
  { name: "categorias", label: "Categorias", icon: Grid3x3 },
  { name: "perfil", label: "Minha conta", icon: User },
  { name: "configuracoes", label: "Configurações", icon: Settings },
];

/** Barra inferior para celulares, com folha "Mais" para as demais páginas. */
export function MobileNav() {
  const { route, navigate } = useRouter();
  const { account } = useApp();
  const [more, setMore] = useState(false);
  const moreItems = account?.role === "admin" ? [...MORE, { name: "admin" as RouteName, label: "Painel admin", icon: LayoutDashboard }] : MORE;
  const go = (n: RouteName) => { setMore(false); navigate(n === "perfil" && !account ? "entrar" : n); };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-paper/10 bg-ink/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden" aria-label="Navegação inferior">
        <ul className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = route.name === t.name;
            return (
              <li key={t.name}>
                <button onClick={() => go(t.name)} aria-current={active ? "page" : undefined} className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-lamp" : "text-paper/70"}`}>
                  <t.icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {t.label}
                </button>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMore(true)} aria-expanded={more} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-paper/70">
              <Menu size={22} strokeWidth={1.8} />
              Mais
            </button>
          </li>
        </ul>
      </nav>
      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Mais páginas"
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-surface px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-3"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper/20" aria-hidden />
              <div className="mb-2 flex items-center justify-between">
                <p className="text-lg font-bold">Explorar</p>
                <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper/10" onClick={() => setMore(false)} aria-label="Fechar"><X size={20} /></button>
              </div>
              <ul className="grid grid-cols-3 gap-2">
                {moreItems.map((m) => (
                  <li key={m.name}>
                    <button onClick={() => go(m.name)} className="flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-raised/60 text-xs font-semibold text-paper/85 active:scale-95">
                      <m.icon size={22} className="text-lamp" />
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3"><SourceDownloadButton className="btn-glass w-full" /></div>
              {!account && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-primary" onClick={() => go("entrar")}>Entrar</button>
                  <button className="btn-glass" onClick={() => go("cadastro")}>Criar conta</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
