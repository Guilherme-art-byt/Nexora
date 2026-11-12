import { motion } from "framer-motion";
import {
  ArrowLeft, BarChart3, Clapperboard, Eye, Film, ImagePlus, LayoutDashboard, Lock, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, Tv, Upload, Users, Video, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EmptyState, RatingBadge, Spinner } from "@/components/ui";
import { DEMO_TITLES, GENRES, RATING_INFO } from "@/data/catalog";
import { useDocumentTitle } from "@/hooks";
import { uid } from "@/lib/crypto";
import { normalize, relativeTime, slugify } from "@/lib/format";
import { useRouter, type RouteName } from "@/lib/router";
import { isDemo, repo, tmdbEnabled, tmdbTransport } from "@/services";
import { importFromTmdb, searchTmdb, withOfficialArt, type TmdbHit } from "@/services/tmdb";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Account, AgeRating, Episode, Season, Title, VideoSource, ViewEvent } from "@/types";

const TABS: { name: RouteName; label: string; icon: typeof Film }[] = [
  { name: "admin", label: "Painel", icon: LayoutDashboard },
  { name: "admin-titulos", label: "Títulos", icon: Clapperboard },
  { name: "admin-usuarios", label: "Usuários", icon: Users },
  { name: "admin-fontes", label: "Fontes de vídeo", icon: Video },
];

/** Layout protegido: apenas contas com papel "admin". No Supabase a mesma regra é imposta por RLS. */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { account, authReady } = useApp();
  const { route, navigate } = useRouter();

  if (!authReady) return <div className="grid min-h-[60vh] place-items-center"><Spinner size={28} /></div>;
  if (!account || account.role !== "admin") {
    return (
      <div className="pt-28">
        <EmptyState
          icon={<Lock size={28} />}
          title="Área restrita"
          body={account ? "Sua conta não tem permissão de administrador." : "Entre com uma conta de administrador para acessar o painel."}
          action={<button className="btn-primary" onClick={() => navigate(account ? "inicio" : "entrar")}>{account ? "Voltar ao início" : "Entrar"}</button>}
        />
      </div>
    );
  }

  return (
    <div className="page-x pb-16 pt-24 sm:pt-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-lamp">Administração</p>
          <h1 className="display text-5xl">Painel Lanterna</h1>
        </div>
        {isDemo && <p className="max-w-sm text-xs leading-relaxed text-mute">Modo demonstração: alterações ficam salvas neste navegador. Com o Supabase configurado, vão para o banco.</p>}
      </div>
      <nav className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Seções do painel">
        {TABS.map((t) => {
          const active = route.name === t.name || (t.name === "admin-titulos" && route.name === "editar");
          return (
            <button key={t.name} onClick={() => navigate(t.name)} aria-current={active ? "page" : undefined} className={`chip shrink-0 !min-h-[42px] !px-4 ${active ? "chip-on" : ""}`}>
              <t.icon size={17} /> {t.label}
            </button>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Dashboard */
export function AdminDashboard() {
  useDocumentTitle("Painel administrativo");
  const { allTitles, getTitle } = useApp();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [views, setViews] = useState<ViewEvent[] | null>(null);

  useEffect(() => {
    repo.listAccounts().then(setAccounts).catch(() => setAccounts([]));
    repo.listViews().then(setViews).catch(() => setViews([]));
  }, []);

  const movies = allTitles.filter((t) => t.kind === "movie").length;
  const series = allTitles.length - movies;
  const episodes = allTitles.reduce((n, t) => n + (t.seasons?.reduce((m, s) => m + s.episodes.length, 0) ?? 0), 0);

  const top = useMemo(() => {
    const count = new Map<string, number>();
    (views ?? []).forEach((v) => count.set(v.titleId, (count.get(v.titleId) ?? 0) + 1));
    return [...count].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ t: getTitle(id), n })).filter((x) => x.t);
  }, [views, getTitle]);

  const days = useMemo(() => {
    const out: { label: string; n: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      out.push({ label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), n: (views ?? []).filter((v) => v.at.slice(0, 10) === key).length });
    }
    return out;
  }, [views]);
  const max = Math.max(1, ...days.map((d) => d.n));

  const activity = useMemo(() => {
    const items: { at: string; text: string }[] = [];
    (views ?? []).slice(-8).forEach((v) => items.push({ at: v.at, text: `Reprodução de ${getTitle(v.titleId)?.title ?? "título removido"}` }));
    (accounts ?? []).forEach((a) => items.push({ at: a.createdAt, text: `Nova conta: ${a.name}` }));
    allTitles.filter((t) => t.origin !== "demo").forEach((t) => items.push({ at: t.addedAt, text: `Título publicado: ${t.title}` }));
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [views, accounts, allTitles, getTitle]);

  const stat = (label: string, value: ReactNode, icon: ReactNode, hint?: string) => (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between text-mute"><span className="text-sm font-semibold">{label}</span>{icon}</div>
      <p className="mt-2 font-display text-5xl font-bold leading-none">{value}</p>
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Usuários", accounts ? accounts.length : <Spinner />, <Users size={20} />)}
        {stat("Filmes", movies, <Film size={20} />)}
        {stat("Séries", series, <Tv size={20} />, `${episodes} episódios`)}
        {stat("Visualizações", views ? views.length : <Spinner />, <Eye size={20} />, isDemo ? "registradas neste navegador" : "total registrado")}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card-surface p-5" aria-labelledby="chart-t">
          <h2 id="chart-t" className="flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-lamp" /> Visualizações nos últimos 7 dias</h2>
          <div className="mt-6 flex h-44 items-end gap-2" role="img" aria-label={days.map((d) => `${d.label}: ${d.n}`).join(", ")}>
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-paper/80">{d.n}</span>
                <motion.div className="w-full rounded-t-md bg-lamp/80" initial={{ height: 0 }} animate={{ height: `${(d.n / max) * 120}px` }} style={{ minHeight: 3 }} />
                <span className="text-xs capitalize text-mute">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card-surface p-5" aria-labelledby="top-t">
          <h2 id="top-t" className="font-bold">Conteúdos mais acessados</h2>
          {top.length ? (
            <ol className="mt-4 space-y-3">
              {top.map(({ t, n }, i) => (
                <li key={t!.id} className="flex items-center gap-3">
                  <span className="w-5 font-display text-2xl font-bold text-mute">{i + 1}</span>
                  <img src={t!.poster} alt="" className="h-12 w-8 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t!.title}</span>
                  <span className="text-sm text-mute">{n} {n === 1 ? "vez" : "vezes"}</span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-mute">Ainda não há reproduções registradas. Elas aparecem aqui assim que alguém assistir a um título.</p>}
        </section>
      </div>
      <section className="card-surface p-5" aria-labelledby="act-t">
        <h2 id="act-t" className="font-bold">Atividade recente</h2>
        {activity.length ? (
          <ul className="mt-3 divide-y divide-line/60">
            {activity.map((a, i) => <li key={i} className="flex justify-between gap-4 py-2.5 text-sm"><span>{a.text}</span><span className="shrink-0 text-mute">{relativeTime(a.at)}</span></li>)}
          </ul>
        ) : <p className="mt-3 text-sm text-mute">Sem atividade ainda.</p>}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Lista de títulos */
export function AdminTitles() {
  useDocumentTitle("Títulos | Admin");
  const { allTitles, reloadCatalog } = useApp();
  const { navigate } = useRouter();
  const { confirm, toast } = useUI();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "movie" | "series">("all");
  const [tmdbOpen, setTmdbOpen] = useState(false);
  const list = useMemo(
    () => allTitles.filter((t) => (kind === "all" || t.kind === kind) && normalize(t.title).includes(normalize(q))).sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    [allTitles, q, kind],
  );

  const remove = async (t: Title) => {
    if (!(await confirm({ title: `Excluir ${t.title}?`, body: "O título sai do catálogo para todos os usuários, junto com temporadas e episódios.", confirmLabel: "Excluir título", danger: true }))) return;
    try { await repo.deleteTitle(t.id); await reloadCatalog(); toast(`${t.title} foi excluído`); }
    catch (e) { toast((e as Error).message, "error"); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className="field !pl-10" placeholder="Buscar no catálogo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar título" />
        </div>
        <select className="field !w-auto" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tipo">
          <option value="all">Todos</option><option value="movie">Filmes</option><option value="series">Séries</option>
        </select>
        {!isDemo && (
          <button
            className="btn-ghost"
            onClick={async () => {
              if (!(await confirm({ title: "Publicar o catálogo de demonstração?", body: `${DEMO_TITLES.length} títulos fictícios com artes originais serão gravados no banco. Títulos com o mesmo id serão sobrescritos.`, confirmLabel: "Publicar catálogo" }))) return;
              try { for (const t of DEMO_TITLES) await repo.saveTitle(t); await reloadCatalog(); toast("Catálogo de demonstração publicado"); }
              catch (e) { toast((e as Error).message, "error"); }
            }}
          >
            Publicar catálogo demo
          </button>
        )}
        {tmdbEnabled && (
          <button
            className="btn-ghost"
            onClick={async () => {
              try {
                const updated = await withOfficialArt(allTitles, { force: true });
                const changed = updated.filter((u, i) => u.poster !== allTitles[i].poster);
                for (const t of changed) await repo.saveTitle(t);
                await reloadCatalog();
                toast(`${changed.length} títulos receberam pôsteres oficiais do TMDB`);
              } catch (e) { toast((e as Error).message, "error"); }
            }}
          >
            Buscar pôsteres oficiais
          </button>
        )}
        <button className="btn-glass" onClick={() => setTmdbOpen(true)}><Upload size={17} /> Importar do TMDB</button>
        <button className="btn-primary" onClick={() => navigate("editar", "novo")}><Plus size={18} /> Novo título</button>
      </div>
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3 font-semibold">Título</th><th className="p-3 font-semibold">Tipo</th><th className="p-3 font-semibold">Ano</th><th className="p-3 font-semibold">Class.</th><th className="p-3 font-semibold">Nota</th><th className="p-3 font-semibold">Origem</th><th className="p-3"><span className="sr-only">Ações</span></th></tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {list.map((t) => (
              <tr key={t.id} className="hover:bg-paper/[.03]">
                <td className="p-3"><div className="flex items-center gap-3"><img src={t.poster} alt="" className="h-12 w-8 rounded object-cover" /><span className="font-semibold">{t.title}</span></div></td>
                <td className="p-3">{t.kind === "movie" ? "Filme" : `Série (${t.seasons?.length ?? 0} temp.)`}</td>
                <td className="p-3">{t.year}</td>
                <td className="p-3"><RatingBadge rating={t.rating} /></td>
                <td className="p-3">{t.score.toFixed(1)}</td>
                <td className="p-3 text-mute">{t.origin === "tmdb" ? "TMDB" : t.origin === "admin" ? "Manual" : "Demo"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-paper/10" onClick={() => navigate("editar", t.id)} aria-label={`Editar ${t.title}`}><Pencil size={16} /></button>
                    <button className="grid h-9 w-9 place-items-center rounded-lg text-ember hover:bg-ember/10" onClick={() => remove(t)} aria-label={`Excluir ${t.title}`}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-sm text-mute">Nenhum título encontrado.</p>}
      </div>
      {tmdbOpen && <TmdbImport onClose={() => setTmdbOpen(false)} />}
    </div>
  );
}

function TmdbImport({ onClose }: { onClose: () => void }) {
  const { reloadCatalog } = useApp();
  const { toast } = useUI();
  const { navigate } = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const search = async () => {
    if (!q.trim()) return;
    setBusy("search");
    try { setHits(await searchTmdb(q)); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(null); }
  };
  const importHit = async (h: TmdbHit) => {
    setBusy(String(h.id));
    try {
      const t = await importFromTmdb(h);
      await repo.saveTitle(t);
      await reloadCatalog();
      toast(`${t.title} importado. Configure a fonte de vídeo antes de publicar a reprodução.`);
      onClose();
      navigate("editar", t.id);
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Importar do TMDB" className="max-h-[85svh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Importar do TMDB</h2><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper/10" aria-label="Fechar"><X size={18} /></button></div>
        {!tmdbTransport ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-paper/85">
            <p>A integração está pronta, mas precisa de uma chave do TMDB, que fica no servidor e nunca no navegador. O caminho mais curto:</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-mute">
              <li>No arquivo .env, preencha TMDB_API_KEY com a sua chave.</li>
              <li>Defina VITE_TMDB_PROXY=true.</li>
              <li>Reinicie com npm run dev. Os pôsteres oficiais aparecem sozinhos.</li>
            </ol>
            <p className="text-mute">Os passos completos estão no README, na seção Integração TMDB.</p>
          </div>
        ) : (
          <>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
              <input className="field" placeholder="Nome do filme ou série" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              <button className="btn-primary" disabled={busy === "search"}>{busy === "search" ? <Spinner /> : <Search size={17} />} Buscar</button>
            </form>
            <ul className="mt-4 divide-y divide-line/60">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`} className="flex items-center gap-3 py-3">
                  {h.poster ? <img src={h.poster} alt="" className="h-16 w-11 rounded object-cover" /> : <span className="h-16 w-11 rounded bg-raised" />}
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{h.title}</span><span className="text-xs text-mute">{h.kind === "movie" ? "Filme" : "Série"}{h.year ? ` de ${h.year}` : ""}</span></span>
                  <button className="btn-glass !min-h-[38px]" onClick={() => importHit(h)} disabled={!!busy}>{busy === String(h.id) ? <Spinner /> : "Importar"}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Editor de título */
const blank = (): Title => ({
  id: "", kind: "movie", title: "", tagline: "", synopsis: "", year: new Date().getFullYear(), genres: [], rating: "12", score: 7, popularity: 50,
  durationMin: 100, cast: [], directors: [], country: "Brasil", languages: ["Português"], subtitles: ["Português"], keywords: [],
  poster: "", backdrop: "", sourceId: "demo", trailerSourceId: "demo", addedAt: new Date().toISOString(), origin: "admin",
});

export function AdminTitleEditor({ id }: { id: string }) {
  const { getTitle, reloadCatalog, sources } = useApp();
  const { navigate } = useRouter();
  const { toast } = useUI();
  const existing = id !== "novo" ? getTitle(id) : undefined;
  const [t, setT] = useState<Title>(() => existing ?? blank());
  const [busy, setBusy] = useState(false);
  const [castText, setCastText] = useState(() => (existing?.cast ?? []).map((c) => (c.role ? `${c.name} | ${c.role}` : c.name)).join("\n"));
  useDocumentTitle(existing ? `Editar ${existing.title}` : "Novo título");
  const set = <K extends keyof Title>(k: K, v: Title[K]) => setT((x) => ({ ...x, [k]: v }));

  if (id !== "novo" && !existing) return <EmptyState icon={<Film size={28} />} title="Título não encontrado" body="Ele pode ter sido excluído." action={<button className="btn-primary" onClick={() => navigate("admin-titulos")}>Voltar</button>} />;

  const save = async () => {
    const errors: string[] = [];
    if (t.title.trim().length < 1) errors.push("título");
    if (t.synopsis.trim().length < 10) errors.push("sinopse (mínimo 10 caracteres)");
    if (!t.genres.length) errors.push("ao menos um gênero");
    if (!t.poster) errors.push("pôster");
    if (!t.backdrop) errors.push("imagem de fundo");
    if (t.kind === "series" && !(t.seasons?.length && t.seasons.every((s) => s.episodes.length))) errors.push("temporadas com episódios");
    if (errors.length) return toast(`Preencha: ${errors.join(", ")}.`, "error");
    setBusy(true);
    try {
      const final: Title = {
        ...t,
        id: t.id || `${slugify(t.title)}-${uid().slice(0, 4)}`,
        title: t.title.trim(),
        cast: castText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [name, role] = l.split("|").map((x) => x.trim()); return { name, role }; }),
        durationMin: t.kind === "movie" ? t.durationMin : undefined,
        seasons: t.kind === "series" ? t.seasons : undefined,
        origin: t.origin === "demo" ? "admin" : t.origin,
      };
      await repo.saveTitle(final);
      await reloadCatalog();
      toast(existing ? "Alterações publicadas" : `${final.title} publicado no catálogo`);
      navigate("admin-titulos");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button className="icon-btn" onClick={() => navigate("admin-titulos")} aria-label="Voltar para títulos"><ArrowLeft size={18} /></button>
        <h2 className="text-2xl font-bold">{existing ? `Editar ${existing.title}` : "Novo título"}</h2>
        <div className="ml-auto flex gap-2">
          {existing && <a className="btn-ghost" href={`#titulo-${existing.id}`}>Ver página</a>}
          <button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />} {existing ? "Salvar alterações" : "Publicar título"}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title="Informações principais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <div className="flex rounded-lg border border-line bg-ink/60 p-1">
                  {(["movie", "series"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => set("kind", k)} className={`min-h-[40px] flex-1 rounded-md text-sm font-semibold ${t.kind === k ? "bg-paper text-ink" : "text-paper/70"}`}>{k === "movie" ? "Filme" : "Série"}</button>
                  ))}
                </div>
              </Field>
              <Field label="Título"><input className="field" value={t.title} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="Título original"><input className="field" value={t.originalTitle ?? ""} onChange={(e) => set("originalTitle", e.target.value || undefined)} /></Field>
              {t.kind === "series" && <Field label="Total de temporadas da série"><input type="number" min={1} className="field" value={t.seasonCount ?? t.seasons?.length ?? 1} onChange={(e) => set("seasonCount", Number(e.target.value))} /></Field>}
              <Field label="Prêmios (ex.: Oscar de melhor filme)"><input className="field" value={t.awards ?? ""} onChange={(e) => { set("awards", e.target.value || undefined); set("awarded", !!e.target.value); }} /></Field>
              <Field label="Frase de destaque"><input className="field" value={t.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></Field>
              <Field label="Sinopse" wide><textarea className="field min-h-[120px]" value={t.synopsis} onChange={(e) => set("synopsis", e.target.value)} /></Field>
              <Field label="Ano"><input type="number" className="field" value={t.year} min={1900} max={2100} onChange={(e) => set("year", Number(e.target.value))} /></Field>
              <Field label="Classificação indicativa">
                <select className="field" value={t.rating} onChange={(e) => set("rating", e.target.value as AgeRating)}>
                  {(Object.keys(RATING_INFO) as AgeRating[]).map((r) => <option key={r} value={r}>{RATING_INFO[r].label}</option>)}
                </select>
              </Field>
              <Field label="Nota (0 a 10)"><input type="number" step={0.1} min={0} max={10} className="field" value={t.score} onChange={(e) => set("score", Number(e.target.value))} /></Field>
              <Field label="Popularidade (0 a 100)"><input type="number" min={0} max={100} className="field" value={t.popularity} onChange={(e) => set("popularity", Number(e.target.value))} /></Field>
              {t.kind === "movie" && <Field label="Duração (min)"><input type="number" min={1} className="field" value={t.durationMin ?? 0} onChange={(e) => set("durationMin", Number(e.target.value))} /></Field>}
              <Field label="País de origem"><input className="field" value={t.country} onChange={(e) => set("country", e.target.value)} /></Field>
            </div>
            <fieldset className="mt-5">
              <legend className="label">Gêneros</legend>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => <button type="button" key={g} aria-pressed={t.genres.includes(g)} className={`chip ${t.genres.includes(g) ? "chip-on" : ""}`} onClick={() => set("genres", t.genres.includes(g) ? t.genres.filter((x) => x !== g) : [...t.genres, g])}>{g}</button>)}
              </div>
            </fieldset>
            <div className="mt-5 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#F0A83A]" checked={!!t.original} onChange={(e) => set("original", e.target.checked)} /> Original Lanterna</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#F0A83A]" checked={!!t.awarded} onChange={(e) => set("awarded", e.target.checked)} /> Premiado</label>
            </div>
          </Card>

          <Card title="Elenco e equipe">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Elenco (um por linha, “Nome | Personagem”)"><textarea className="field min-h-[130px] font-mono text-sm" value={castText} onChange={(e) => setCastText(e.target.value)} /></Field>
              <div className="space-y-4">
                <Field label={t.kind === "series" ? "Criação (separe por vírgula)" : "Direção (separe por vírgula)"}><input className="field" value={t.directors.join(", ")} onChange={(e) => set("directors", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
                <Field label="Idiomas de áudio"><input className="field" value={t.languages.join(", ")} onChange={(e) => set("languages", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
                <Field label="Legendas"><input className="field" value={t.subtitles.join(", ")} onChange={(e) => set("subtitles", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
                <Field label="Palavras-chave (busca)"><input className="field" value={t.keywords.join(", ")} onChange={(e) => set("keywords", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
              </div>
            </div>
          </Card>

          {t.kind === "series" && <SeasonsEditor seasons={t.seasons ?? []} titleId={t.id || slugify(t.title) || "nova-serie"} onChange={(s) => set("seasons", s)} />}
        </div>

        <div className="space-y-6">
          <Card title="Imagens">
            <ImageInput label="Pôster (2:3)" value={t.poster} folder="posters" ratio="aspect-[2/3]" onChange={(v) => set("poster", v)} />
            <div className="mt-4"><ImageInput label="Imagem de fundo (16:9)" value={t.backdrop} folder="backdrops" ratio="aspect-video" onChange={(v) => set("backdrop", v)} /></div>
          </Card>
          <Card title="Vídeo e trailer">
            <Field label="Fonte de vídeo autorizada">
              <select className="field" value={t.sourceId ?? ""} onChange={(e) => set("sourceId", e.target.value || undefined)}>
                <option value="">Sem fonte (reprodução indisponível)</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="mt-4">
              <Field label="Trailer">
                <select className="field" value={t.trailerSourceId ?? ""} onChange={(e) => set("trailerSourceId", e.target.value || undefined)}>
                  <option value="">Sem trailer próprio</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="mt-4"><Field label="ou código do trailer no YouTube"><input className="field" placeholder="ex.: dQw4w9WgXcQ" value={t.trailerYoutubeKey ?? ""} onChange={(e) => set("trailerYoutubeKey", e.target.value.trim() || undefined)} /></Field></div>
            <p className="mt-3 text-xs leading-relaxed text-mute">Cadastre apenas vídeos que você tem direito de exibir. Metadados do TMDB não incluem licença de exibição.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SeasonsEditor({ seasons, titleId, onChange }: { seasons: Season[]; titleId: string; onChange: (s: Season[]) => void }) {
  const [open, setOpen] = useState(seasons[0]?.number ?? 1);
  const addSeason = () => {
    const n = (seasons[seasons.length - 1]?.number ?? 0) + 1;
    onChange([...seasons, { number: n, year: new Date().getFullYear(), episodes: [] }]);
    setOpen(n);
  };
  const updateSeason = (n: number, patch: Partial<Season>) => onChange(seasons.map((s) => (s.number === n ? { ...s, ...patch } : s)));
  const s = seasons.find((x) => x.number === open);
  const addEp = () => {
    if (!s) return;
    const num = s.episodes.length + 1;
    const ep: Episode = { id: `${titleId}-t${s.number}e${num}-${uid().slice(0, 4)}`, number: num, title: `Episódio ${num}`, synopsis: "", durationMin: 45 };
    updateSeason(s.number, { episodes: [...s.episodes, ep] });
  };
  const updEp = (id: string, patch: Partial<Episode>) => s && updateSeason(s.number, { episodes: s.episodes.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const delEp = (id: string) => s && updateSeason(s.number, { episodes: s.episodes.filter((e) => e.id !== id).map((e, i) => ({ ...e, number: i + 1 })) });

  return (
    <Card title="Temporadas e episódios">
      <div className="mb-4 flex flex-wrap gap-2">
        {seasons.map((x) => <button key={x.number} type="button" className={`chip ${open === x.number ? "chip-on" : ""}`} onClick={() => setOpen(x.number)}>Temporada {x.number} ({x.episodes.length})</button>)}
        <button type="button" className="chip" onClick={addSeason}><Plus size={15} /> Temporada</button>
      </div>
      {s ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Ano da temporada"><input type="number" className="field !w-32" value={s.year} onChange={(e) => updateSeason(s.number, { year: Number(e.target.value) })} /></Field>
            <button type="button" className="btn-ghost !text-ember" onClick={() => { onChange(seasons.filter((x) => x.number !== s.number).map((x, i) => ({ ...x, number: i + 1 }))); setOpen(1); }}><Trash2 size={16} /> Remover temporada</button>
          </div>
          {s.episodes.map((e) => (
            <div key={e.id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[60px_1fr_110px_auto]">
              <span className="font-display text-3xl font-bold text-mute">{e.number}</span>
              <div className="space-y-2">
                <input className="field" value={e.title} onChange={(ev) => updEp(e.id, { title: ev.target.value })} aria-label={`Título do episódio ${e.number}`} />
                <textarea className="field min-h-[64px] text-sm" placeholder="Sinopse do episódio" value={e.synopsis} onChange={(ev) => updEp(e.id, { synopsis: ev.target.value })} aria-label={`Sinopse do episódio ${e.number}`} />
              </div>
              <label className="text-xs text-mute">Duração (min)<input type="number" min={1} className="field mt-1" value={e.durationMin} onChange={(ev) => updEp(e.id, { durationMin: Number(ev.target.value) })} /></label>
              <button type="button" onClick={() => delEp(e.id)} className="grid h-10 w-10 place-items-center self-start rounded-lg text-ember hover:bg-ember/10" aria-label={`Remover episódio ${e.number}`}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="btn-glass" onClick={addEp}><Plus size={17} /> Adicionar episódio</button>
        </div>
      ) : <p className="text-sm text-mute">Adicione a primeira temporada para cadastrar episódios.</p>}
    </Card>
  );
}

function ImageInput({ label, value, folder, ratio, onChange }: { label: string; value: string; folder: "posters" | "backdrops"; ratio: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();
  const upload = async (f?: File) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast("Imagem acima de 8 MB. Envie um arquivo menor.", "error");
    setBusy(true);
    try { onChange(await repo.uploadImage(f, folder)); toast("Imagem enviada"); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };
  return (
    <div>
      <p className="label">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} className={`relative grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-ink/50 text-mute hover:border-lamp/60 ${ratio}`} aria-label={`Enviar ${label}`}>
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm"><ImagePlus size={26} /> Enviar imagem</span>}
        {busy && <span className="absolute inset-0 grid place-items-center bg-black/60"><Spinner size={26} /></span>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <input className="field mt-2 text-xs" placeholder="ou cole a URL da imagem" value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card-surface p-5"><h3 className="mb-4 font-bold">{title}</h3>{children}</section>;
}
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "sm:col-span-2" : ""}`}><span className="label">{label}</span>{children}</label>;
}

/* ------------------------------------------------------------------ Usuários */
export function AdminUsers() {
  useDocumentTitle("Usuários | Admin");
  const { account } = useApp();
  const { toast, confirm } = useUI();
  const [list, setList] = useState<Account[] | null>(null);
  const [q, setQ] = useState("");
  const load = () => repo.listAccounts().then(setList).catch((e) => { toast((e as Error).message, "error"); setList([]); });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); load(); } catch (e) { toast((e as Error).message, "error"); }
  };

  const filtered = (list ?? []).filter((a) => normalize(a.name + a.email).includes(normalize(q)));

  return (
    <div>
      <div className="relative mb-5 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input className="field !pl-10" placeholder="Buscar por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuário" />
      </div>
      {!list ? <Spinner size={26} /> : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-mute"><tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Papel</th><th className="p-3">Situação</th><th className="p-3">Desde</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="p-3 font-semibold">{a.name}{a.id === account?.id && <span className="ml-2 text-xs text-mute">(você)</span>}</td>
                  <td className="p-3 text-paper/80">{a.email}</td>
                  <td className="p-3">{a.role === "admin" ? <span className="rounded-full bg-lamp/15 px-2 py-0.5 text-xs font-bold text-lamp">Administrador</span> : "Usuário"}</td>
                  <td className="p-3">{a.disabled ? <span className="text-ember">Desativada</span> : <span className="text-ok">Ativa</span>}</td>
                  <td className="p-3 text-mute">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-ghost !min-h-[36px] !px-3 text-xs"
                        onClick={async () => {
                          const toAdmin = a.role !== "admin";
                          if (await confirm({ title: toAdmin ? `Tornar ${a.name} administrador?` : `Remover acesso de administrador de ${a.name}?`, body: toAdmin ? "A conta poderá editar o catálogo e gerenciar usuários." : "A conta perde acesso ao painel.", confirmLabel: toAdmin ? "Tornar administrador" : "Remover acesso", danger: !toAdmin })) {
                            act(() => repo.setRole(a.id, toAdmin ? "admin" : "user"), "Permissão atualizada");
                          }
                        }}
                      >
                        {a.role === "admin" ? <ShieldOff size={15} /> : <ShieldCheck size={15} />} {a.role === "admin" ? "Rebaixar" : "Promover"}
                      </button>
                      {a.id !== account?.id && (
                        <button
                          className={`btn-ghost !min-h-[36px] !px-3 text-xs ${a.disabled ? "" : "!text-ember"}`}
                          onClick={async () => {
                            if (a.disabled || (await confirm({ title: `Desativar a conta de ${a.name}?`, body: "A pessoa não conseguirá entrar até ser reativada.", confirmLabel: "Desativar conta", danger: true }))) {
                              act(() => repo.setDisabled(a.id, !a.disabled), a.disabled ? "Conta reativada" : "Conta desativada");
                            }
                          }}
                        >
                          {a.disabled ? "Reativar" : "Desativar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Fontes de vídeo */
export function AdminSources() {
  useDocumentTitle("Fontes de vídeo | Admin");
  const { sources, reloadCatalog, allTitles } = useApp();
  const { toast, confirm } = useUI();
  const [form, setForm] = useState({ name: "", url720: "", url360: "", vtt: "", license: "" });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.name.trim() || !/^https:\/\//.test(form.url720)) return toast("Informe um nome e uma URL https do arquivo de vídeo.", "error");
    if (!form.license.trim()) return toast("Descreva a licença ou autorização de exibição.", "error");
    setBusy(true);
    const s: VideoSource = {
      id: `src-${uid().slice(0, 8)}`, name: form.name.trim(), kind: /\.m3u8(\?|$)/.test(form.url720) ? "hls" : "file", license: form.license.trim(),
      renditions: [{ label: "720p", height: 720, src: form.url720 }, ...(form.url360 ? [{ label: "360p", height: 360, src: form.url360 }] : [])],
      audio: [{ id: "orig", label: "Original", lang: "orig" }],
      subtitles: form.vtt.trim() ? [{ id: "pt", label: "Português", lang: "pt", vtt: form.vtt.trim() }] : [],
    };
    try { await repo.saveSource(s); await reloadCatalog(); setForm({ name: "", url720: "", url360: "", vtt: "", license: "" }); toast("Fonte cadastrada. Associe-a a um título no editor."); }
    catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  const remove = async (s: VideoSource) => {
    const used = allTitles.filter((t) => t.sourceId === s.id).length;
    if (await confirm({ title: `Excluir a fonte ${s.name}?`, body: used ? `${used} título(s) usam esta fonte e ficarão sem reprodução.` : "Nenhum título usa esta fonte.", confirmLabel: "Excluir fonte", danger: true })) {
      try { await repo.deleteSource(s.id); await reloadCatalog(); toast("Fonte excluída"); } catch (e) { toast((e as Error).message, "error"); }
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <section className="card-surface divide-y divide-line/60" aria-label="Fontes cadastradas">
        {sources.map((s) => (
          <div key={s.id} className="flex items-start gap-4 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lamp/15 text-lamp"><Video size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-mute">{s.renditions.map((r) => r.label).join(", ")}; {s.audio.length} áudio; {s.subtitles.length} legenda(s); usada por {allTitles.filter((t) => t.sourceId === s.id).length} título(s)</p>
              <p className="mt-1 text-xs text-mute">{s.license}</p>
            </div>
            {s.id !== "demo" && <button onClick={() => remove(s)} className="grid h-9 w-9 place-items-center rounded-lg text-ember hover:bg-ember/10" aria-label={`Excluir ${s.name}`}><Trash2 size={16} /></button>}
          </div>
        ))}
      </section>
      <section className="card-surface p-5" aria-labelledby="ns">
        <h2 id="ns" className="mb-4 font-bold">Nova fonte autorizada</h2>
        <div className="space-y-3">
          <Field label="Nome"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Curta próprio, temporada 1" /></Field>
          <Field label="URL do vídeo em 720p (MP4)"><input className="field" value={form.url720} onChange={(e) => setForm({ ...form, url720: e.target.value })} placeholder="https://" /></Field>
          <Field label="URL em 360p (opcional)"><input className="field" value={form.url360} onChange={(e) => setForm({ ...form, url360: e.target.value })} placeholder="https://" /></Field>
          <Field label="Legenda WebVTT (opcional)"><textarea className="field min-h-[80px] font-mono text-xs" value={form.vtt} onChange={(e) => setForm({ ...form, vtt: e.target.value })} placeholder={"WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nTexto"} /></Field>
          <Field label="Licença ou autorização"><input className="field" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} placeholder="Ex.: produção própria; contrato nº 123" /></Field>
          <button className="btn-primary w-full" onClick={add} disabled={busy}>{busy && <Spinner />} Cadastrar fonte</button>
          <p className="text-xs leading-relaxed text-mute">O player reproduz MP4 diretamente. Para HLS (.m3u8) em navegadores sem suporte nativo, adicione a biblioteca hls.js (instruções no README).</p>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Rotas do painel */
export function AdminRoutes({ route }: { route: { name: string; param?: string } }) {
  return (
    <AdminLayout>
      {route.name === "admin-titulos" ? <AdminTitles />
        : route.name === "admin-usuarios" ? <AdminUsers />
        : route.name === "admin-fontes" ? <AdminSources />
        : route.name === "editar" ? <AdminTitleEditor key={route.param} id={route.param ?? "novo"} />
        : <AdminDashboard />}
    </AdminLayout>
  );
}
