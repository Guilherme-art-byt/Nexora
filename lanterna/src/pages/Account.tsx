import { motion } from "framer-motion";
import { Camera, Clapperboard, History, LogIn, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { latestPerTitle } from "@/components/ContinueWatching";
import { MovieCarousel } from "@/components/MovieCarousel";
import { Avatar, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { GENRES } from "@/data/catalog";
import { useDocumentTitle } from "@/hooks";
import { relativeTime } from "@/lib/format";
import { useRouter } from "@/lib/router";
import { isDemo, repo } from "@/services";
import { PROFILE_COLORS, useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Profile, Title } from "@/types";
import { EMAIL_RE, PasswordField, passwordIssues } from "./Auth";

function NeedsLogin({ title }: { title: string }) {
  const { navigate } = useRouter();
  return (
    <div className="pt-28">
      <EmptyState
        icon={<LogIn size={28} />}
        title={title}
        body="Entre na sua conta para ver seu perfil, histórico e preferências sincronizados."
        action={<div className="flex gap-2"><button className="btn-primary" onClick={() => navigate("entrar")}>Entrar</button><button className="btn-glass" onClick={() => navigate("cadastro")}>Criar conta</button></div>}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Perfil do usuário */
export function ProfilePage() {
  useDocumentTitle("Minha conta");
  const { account, profile, library, getTitle, refreshAccount, isGuest } = useApp();
  const { navigate } = useRouter();
  const { toast } = useUI();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const history = useMemo(
    () => latestPerTitle(library.progress).map((p) => ({ p, t: getTitle(p.titleId) })).filter((x): x is { p: typeof x.p; t: Title } => !!x.t),
    [library.progress, getTitle],
  );
  const listTitles = useMemo(() => library.myList.map(getTitle).filter((t): t is Title => !!t), [library.myList, getTitle]);

  if (isGuest || !account) return <NeedsLogin title="Sua conta" />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast("Informe um nome com pelo menos 2 letras.", "error");
    if (!EMAIL_RE.test(email)) return toast("Informe um e-mail válido.", "error");
    setBusy(true);
    try {
      await repo.updateAccount({ name, email: email !== account.email ? email : undefined });
      await refreshAccount();
      toast(email !== account.email && !isDemo ? "Dados salvos. Confirme o novo e-mail pelo link enviado." : "Dados da conta salvos");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    try {
      const url = await repo.uploadImage(f, "avatars");
      await repo.updateAccount({ avatar: url });
      await refreshAccount();
      toast("Foto de perfil atualizada");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  return (
    <div className="pb-6">
      <PageHeader title="Minha conta" />
      <div className="page-x grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="card-surface p-6" aria-label="Dados da conta">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar profile={{ name: account.name, color: profile.color, avatar: account.avatar, kids: false }} size={84} className="!rounded-2xl" />
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-lamp text-ink" aria-label="Trocar foto de perfil">
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{account.name}</p>
              <p className="truncate text-sm text-mute">{account.email}</p>
              <p className="mt-1 text-xs text-mute">Membro desde {new Date(account.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}{account.role === "admin" ? ", administrador" : ""}</p>
            </div>
          </div>
          <form onSubmit={save} className="mt-6 space-y-4">
            <div><label htmlFor="pname" className="label">Nome</label><input id="pname" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <div><label htmlFor="pemail" className="label">E-mail</label><input id="pemail" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />} Salvar alterações</button>
          </form>
          <div className="mt-6 grid gap-2 border-t border-line pt-5">
            <button className="btn-glass" onClick={() => navigate("perfis")}>Gerenciar perfis</button>
            <button className="btn-ghost" onClick={() => navigate("configuracoes")}>Preferências e segurança</button>
          </div>
        </section>

        <div className="min-w-0 space-y-8">
          <section className="card-surface p-6" aria-labelledby="pref-title">
            <h2 id="pref-title" className="text-lg font-bold">Perfil ativo: {profile.name}</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-mute">Na Minha Lista</dt><dd className="font-display text-4xl font-bold">{library.myList.length}</dd></div>
              <div><dt className="text-mute">Títulos iniciados</dt><dd className="font-display text-4xl font-bold">{history.length}</dd></div>
              <div><dt className="text-mute">Gêneros favoritos</dt><dd className="mt-1 text-paper/90">{profile.preferences.favoriteGenres.join(", ") || "Nenhum escolhido"}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="hist-title">
            <h2 id="hist-title" className="mb-3 flex items-center gap-2 text-lg font-bold"><History size={20} className="text-lamp" /> Histórico de reprodução</h2>
            {history.length ? (
              <ul className="card-surface divide-y divide-line/70">
                {history.slice(0, 12).map(({ p, t }) => (
                  <li key={t.id}>
                    <a href={`#titulo-${t.id}`} className="flex items-center gap-4 p-3 hover:bg-paper/[.04]">
                      <img src={t.backdrop} alt="" className="aspect-video w-28 shrink-0 rounded-lg object-cover" loading="lazy" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{t.title}</span>
                        <span className="block text-sm text-mute">{p.season ? `T${p.season}:E${p.episode}` : "Filme"}, {p.finished ? "concluído" : `${Math.round((p.position / Math.max(1, p.duration)) * 100)}% assistido`}</span>
                      </span>
                      <span className="hidden shrink-0 text-xs text-mute sm:block">{relativeTime(p.updatedAt)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card-surface p-6 text-sm text-mute">Nada assistido ainda neste perfil. O que você assistir aparece aqui.</p>
            )}
          </section>
        </div>
      </div>
      <div className="mt-10">
        <MovieCarousel title="Minha Lista" items={listTitles} action={<a href="#minha-lista" className="text-sm font-semibold text-lamp hover:underline">Ver tudo</a>} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Seleção e gestão de perfis */
export function ProfilesPage() {
  useDocumentTitle("Perfis");
  const { profiles, profile, selectProfile, createProfile, saveProfile, deleteProfile, isGuest } = useApp();
  const { navigate } = useRouter();
  const { toast, confirm } = useUI();
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);

  if (isGuest) return <NeedsLogin title="Perfis da conta" />;

  const remove = async (p: Profile) => {
    if (profiles.length === 1) return toast("A conta precisa ter pelo menos um perfil.", "error");
    if (await confirm({ title: `Excluir o perfil ${p.name}?`, body: "A Minha Lista, o histórico e as preferências deste perfil serão apagados.", confirmLabel: "Excluir perfil", danger: true })) {
      await deleteProfile(p.id);
      toast(`Perfil ${p.name} excluído`);
      setEditing(null);
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-4 pb-28 pt-24 text-center">
      <h1 className="display text-5xl sm:text-7xl">{managing ? "Gerenciar perfis" : "Quem está assistindo?"}</h1>
      <p className="mt-3 text-mute">Cada perfil tem a própria lista, histórico e recomendações.</p>
      <ul className="mt-10 flex flex-wrap justify-center gap-5 sm:gap-8">
        {profiles.map((p, i) => (
          <motion.li key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <button
              onClick={() => (managing ? setEditing(p) : (selectProfile(p.id), navigate("inicio")))}
              className="group flex w-28 flex-col items-center gap-3 sm:w-36"
              aria-label={managing ? `Editar perfil ${p.name}` : `Entrar como ${p.name}`}
            >
              <span className={`relative rounded-2xl ring-2 ring-offset-4 ring-offset-ink transition ${p.id === profile.id ? "ring-lamp" : "ring-transparent group-hover:ring-paper/70"}`}>
                <Avatar profile={p} size={112} className="!rounded-2xl sm:!h-36 sm:!w-36" />
                {managing && <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55"><Pencil size={28} /></span>}
              </span>
              <span className="truncate font-semibold text-paper/80 group-hover:text-paper">{p.name}</span>
            </button>
          </motion.li>
        ))}
        {profiles.length < 5 && (
          <li>
            <button onClick={() => setEditing("new")} className="group flex w-28 flex-col items-center gap-3 sm:w-36" aria-label="Adicionar perfil">
              <span className="grid h-28 w-28 place-items-center rounded-2xl border-2 border-dashed border-paper/25 text-paper/60 transition group-hover:border-paper/70 group-hover:text-paper sm:h-36 sm:w-36"><Plus size={40} /></span>
              <span className="font-semibold text-paper/70">Adicionar perfil</span>
            </button>
          </li>
        )}
      </ul>
      <button className="btn-glass mt-12" onClick={() => setManaging((m) => !m)}>{managing ? "Concluir" : "Gerenciar perfis"}</button>

      {editing && (
        <ProfileEditor
          initial={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onDelete={editing !== "new" ? () => remove(editing) : undefined}
          onSave={async (data) => {
            try {
              if (editing === "new") {
                const p = await createProfile(data.name, data.kids);
                await saveProfile({ ...p, color: data.color, preferences: { ...p.preferences, favoriteGenres: data.genres } });
                toast(`Perfil ${data.name} criado`);
              } else {
                await saveProfile({ ...editing, name: data.name, kids: data.kids, color: data.color, preferences: { ...editing.preferences, favoriteGenres: data.genres } });
                toast("Perfil atualizado");
              }
              setEditing(null);
            } catch (err) {
              toast((err as Error).message, "error");
            }
          }}
        />
      )}
    </div>
  );
}

function ProfileEditor({ initial, onSave, onCancel, onDelete }: { initial?: Profile; onSave: (d: { name: string; kids: boolean; color: string; genres: string[] }) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kids, setKids] = useState(initial?.kids ?? false);
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLORS[1]);
  const [genres, setGenres] = useState<string[]>(initial?.preferences.favoriteGenres ?? []);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 text-left backdrop-blur-sm" onClick={onCancel}>
      <motion.form
        role="dialog" aria-modal="true" aria-labelledby="pe-title"
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => { e.preventDefault(); if (name.trim().length < 1) return; setBusy(true); await onSave({ name: name.trim(), kids, color, genres }); setBusy(false); }}
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id="pe-title" className="text-xl font-bold">{initial ? "Editar perfil" : "Novo perfil"}</h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar profile={{ name: name || "?", color, kids }} size={72} className="!rounded-2xl" />
          <div className="flex-1">
            <label htmlFor="pe-name" className="label">Nome do perfil</label>
            <input id="pe-name" className="field" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
        </div>
        <fieldset className="mt-5">
          <legend className="label">Cor</legend>
          <div className="flex gap-2">
            {PROFILE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`} aria-pressed={color === c} className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-surface ${color === c ? "ring-paper" : "ring-transparent"}`} style={{ background: c }} />
            ))}
          </div>
        </fieldset>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
          <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} className="mt-1 h-5 w-5 accent-[#F0A83A]" />
          <span><span className="block font-semibold">Perfil infantil</span><span className="block text-sm text-mute">Mostra apenas títulos com classificação até 12 anos.</span></span>
        </label>
        <fieldset className="mt-5">
          <legend className="label">Gêneros favoritos (melhoram as recomendações)</legend>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button key={g} type="button" aria-pressed={genres.includes(g)} onClick={() => setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))} className={`chip ${genres.includes(g) ? "chip-on" : ""}`}>{g}</button>
            ))}
          </div>
        </fieldset>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {onDelete && <button type="button" className="btn-ghost !text-ember" onClick={onDelete}><Trash2 size={17} /> Excluir</button>}
          <button type="button" className="btn-ghost ml-auto" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" disabled={busy || !name.trim()}>{busy && <Spinner />} {initial ? "Salvar" : "Criar perfil"}</button>
        </div>
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------------ Configurações */
export function SettingsPage() {
  useDocumentTitle("Configurações");
  const { profile, saveProfile, isGuest, account, library, clearHistory: clearAllHistory } = useApp();
  const { toast, confirm } = useUI();
  const p = profile.preferences;
  const update = (patch: Partial<typeof p>) => {
    const next = { ...profile, preferences: { ...p, ...patch } };
    saveProfile(next).then(() => toast("Preferência salva")).catch((e) => toast((e as Error).message, "error"));
    if (patch.reduceMotion !== undefined) document.documentElement.classList.toggle("reduce-motion", patch.reduceMotion);
  };
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [busy, setBusy] = useState(false);

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    const issues = passwordIssues(nw);
    if (issues.length) return toast(`A nova senha precisa de ${issues.join(", ")}.`, "error");
    setBusy(true);
    try { await repo.changePassword(cur, nw); setCur(""); setNw(""); toast("Senha alterada"); }
    catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(false); }
  };

  const clearHistory = async () => {
    if (await confirm({ title: "Apagar histórico de reprodução?", body: `O progresso de ${new Set(library.progress.map((x) => x.titleId)).size} títulos deste perfil será apagado.`, confirmLabel: "Apagar histórico", danger: true })) {
      await clearAllHistory();
    }
  };

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
      <span><span className="block font-semibold">{label}</span><span className="block text-sm text-mute">{desc}</span></span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-lamp peer-focus-visible:ring-2 peer-focus-visible:ring-lamp/60" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-paper transition peer-checked:translate-x-5" />
      </span>
    </label>
  );

  return (
    <div className="pb-10">
      <PageHeader title="Configurações" description={isGuest ? "Você está como visitante: estas preferências ficam salvas neste aparelho." : `Preferências do perfil ${profile.name}. Cada perfil tem as suas.`} />
      <div className="page-x grid max-w-5xl gap-6 lg:grid-cols-2">
        <section className="card-surface p-6" aria-labelledby="s-play">
          <h2 id="s-play" className="flex items-center gap-2 text-lg font-bold"><Clapperboard size={20} className="text-lamp" /> Reprodução</h2>
          <div className="divide-y divide-line/70">
            <Toggle label="Próximo episódio automático" desc="Começa o episódio seguinte no fim de cada um." checked={p.autoplayNext} onChange={(v) => update({ autoplayNext: v })} />
            <label className="block py-4"><span className="label">Qualidade padrão</span>
              <select className="field" value={p.quality} onChange={(e) => update({ quality: e.target.value })}>
                <option value="auto">Automática (ajusta à tela e à conexão)</option><option value="720p">720p HD</option><option value="360p">360p (economiza dados)</option>
              </select>
            </label>
            <label className="block py-4"><span className="label">Legendas</span>
              <select className="field" value={p.subtitleLang} onChange={(e) => update({ subtitleLang: e.target.value })}>
                <option value="off">Desligadas</option><option value="pt">Português</option><option value="en">Inglês</option><option value="es">Espanhol</option>
              </select>
            </label>
            <Toggle label="Reduzir animações" desc="Desliga movimentos decorativos da interface." checked={p.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
          </div>
        </section>
        <div className="space-y-6">
          {account && (
            <section className="card-surface p-6" aria-labelledby="s-sec">
              <h2 id="s-sec" className="text-lg font-bold">Segurança</h2>
              <form onSubmit={changePw} className="mt-4 space-y-4">
                <PasswordField id="cur" label="Senha atual" value={cur} onChange={setCur} autoComplete="current-password" />
                <PasswordField id="nw" label="Nova senha" value={nw} onChange={setNw} autoComplete="new-password" />
                <button className="btn-primary" disabled={busy || !cur || !nw}>{busy && <Spinner />} Alterar senha</button>
              </form>
            </section>
          )}
          <section className="card-surface p-6" aria-labelledby="s-data">
            <h2 id="s-data" className="text-lg font-bold">Dados do perfil</h2>
            <p className="mt-1 text-sm text-mute">O histórico alimenta Continuar assistindo e as recomendações.</p>
            <button className="btn-ghost mt-4 !text-ember" onClick={clearHistory} disabled={!library.progress.length}><Trash2 size={17} /> Apagar histórico de reprodução</button>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 404 */
export function NotFound() {
  useDocumentTitle("Página não encontrada");
  const { navigate } = useRouter();
  return (
    <div className="relative grid min-h-[100svh] place-items-center overflow-hidden px-6 text-center">
      <div aria-hidden className="absolute left-1/2 top-0 h-[70vh] w-[60vw] -translate-x-1/2 opacity-20 [background:radial-gradient(ellipse_at_top,rgba(240,168,58,.9),transparent_70%)]" />
      <div className="relative">
        <p className="display text-[clamp(7rem,30vw,16rem)] text-paper/10">404</p>
        <h1 className="-mt-6 text-3xl font-bold">Esta sala está vazia</h1>
        <p className="mx-auto mt-3 max-w-md text-mute">O endereço não existe ou o conteúdo foi removido. Volte ao início para escolher outra sessão.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button className="btn-primary" onClick={() => navigate("inicio")}>Ir para o início</button>
          <button className="btn-glass" onClick={() => navigate("buscar")}><UserX size={0} className="hidden" />Pesquisar</button>
        </div>
      </div>
    </div>
  );
}
