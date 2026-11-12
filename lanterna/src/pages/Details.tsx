import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Clapperboard, Film, Play, Plus, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MovieCarousel } from "@/components/MovieCarousel";
import { EmptyState, RatingBadge, Score } from "@/components/ui";
import { RATING_INFO } from "@/data/catalog";
import { useDocumentTitle, useTitleActions } from "@/hooks";
import { displayTitleSize, formatDuration, titleLength } from "@/lib/format";
import { useRouter } from "@/lib/router";
import { VideoPlayer } from "@/player/VideoPlayer";
import { similarTo } from "@/services/recommendations";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Episode, Title } from "@/types";

export default function Details({ id }: { id: string }) {
  const { getTitle, titles, catalogStatus, inList, toggleList, rate, library, sources, canWatch, profile } = useApp();
  const { navigate, back } = useRouter();
  const { play } = useTitleActions();
  const { toast } = useUI();
  const t = getTitle(id);
  useDocumentTitle(t?.title);
  const [trailer, setTrailer] = useState(false);
  const similar = useMemo(() => (t ? similarTo(t, titles) : []), [t, titles]);
  const rating = library.ratings.find((r) => r.titleId === id)?.value;
  const progress = library.progress.find((p) => p.titleId === id);

  if (catalogStatus === "loading") {
    return (
      <div aria-hidden>
        <div className="skeleton h-[62vh] w-full" />
        <div className="page-x -mt-24 space-y-4"><div className="skeleton h-16 w-2/3 rounded-lg" /><div className="skeleton h-4 w-1/2 rounded" /></div>
      </div>
    );
  }

  if (!t) {
    return (
      <div className="pt-28">
        <EmptyState icon={<Film size={28} />} title="Título não encontrado" body="Ele pode ter sido removido do catálogo ou o link está incorreto." action={<button className="btn-primary" onClick={() => navigate("inicio")}>Voltar ao início</button>} />
      </div>
    );
  }

  if (!canWatch(t)) {
    return (
      <div className="pt-28">
        <EmptyState icon={<Film size={28} />} title="Indisponível no perfil infantil" body={`O perfil ${profile.name} mostra apenas títulos com classificação até 12 anos.`} action={<button className="btn-primary" onClick={() => navigate("perfis")}>Trocar de perfil</button>} />
      </div>
    );
  }

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: t.title, text: t.tagline, url });
      else { await navigator.clipboard.writeText(url); toast("Link copiado"); }
    } catch { /* cancelado pelo usuário */ }
  };

  const playLabel = progress && !progress.finished
    ? t.kind === "series" && progress.season ? `Continuar T${progress.season}:E${progress.episode}` : "Continuar"
    : progress?.finished && t.kind === "movie" ? "Assistir de novo" : "Assistir";
  const playbackIsDemo = (sources.find((s) => s.id === t.sourceId)?.kind ?? "demo") === "demo";
  const publicDomain = !!t.sourceId?.startsWith("pd-");
  const hasTrailer = !!t.trailerYoutubeKey || !!(t.trailerSourceId && sources.some((s) => s.id === t.trailerSourceId));

  return (
    <article>
      <div className="relative h-[58vh] min-h-[380px] w-full overflow-hidden sm:h-[68vh]">
        <motion.img src={t.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
        <button onClick={back} className="icon-btn absolute left-4 top-[calc(env(safe-area-inset-top,0px)+76px)] z-10 sm:left-6 lg:left-12" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="page-x relative z-[2] -mt-44 grid gap-8 sm:-mt-52 md:grid-cols-[minmax(200px,260px)_1fr] lg:gap-12">
        <motion.img
          src={t.poster}
          alt={`Pôster de ${t.title}`}
          className="hidden aspect-[2/3] w-full rounded-2xl object-cover shadow-[0_30px_70px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 md:block"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
          {t.original && <p className="mb-2 text-sm font-bold text-lamp">Original Lanterna</p>}
          <h1 className={`display ${displayTitleSize(t.title, "details")} uppercase [text-wrap:balance]`}>{t.title}</h1>
          {t.originalTitle && <p className="mt-2 text-sm text-mute">Título original: <span className="text-paper/80">{t.originalTitle}</span></p>}
          {t.tagline && <p className="mt-2 text-lg font-semibold text-paper/85">{t.tagline}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Score value={t.score} />
            <span>{t.year}</span>
            <span className="inline-flex items-center gap-1.5"><RatingBadge rating={t.rating} size="md" /><span className="text-mute">{RATING_INFO[t.rating].label}</span></span>
            <span>{titleLength(t)}</span>
            <span className="rounded border border-paper/30 px-1.5 text-[11px] font-bold">HD</span>
            {t.awarded && <span className="rounded-full bg-lamp/15 px-2.5 py-0.5 text-xs font-bold text-lamp">{t.awards ?? "Premiado"}</span>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-light min-h-[52px] flex-1 px-8 text-base sm:flex-none" onClick={() => play(t)}>
              <Play size={20} className="fill-ink" /> {playLabel}
            </button>
            {hasTrailer && (
              <button className="btn-glass min-h-[52px] flex-1 px-6 text-base sm:flex-none" onClick={() => setTrailer(true)}>
                <Clapperboard size={20} /> Trailer
              </button>
            )}
            <div className="flex gap-2">
              <button className="icon-btn !h-[52px] !w-[52px]" onClick={() => toggleList(t.id)} aria-label={inList(t.id) ? "Remover da Minha Lista" : "Adicionar à Minha Lista"} title={inList(t.id) ? "Na Minha Lista" : "Adicionar à Minha Lista"}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(inList(t.id))} initial={{ scale: 0.5, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5 }}>
                    {inList(t.id) ? <Check size={22} className="text-lamp" /> : <Plus size={22} />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button className={`icon-btn !h-[52px] !w-[52px] ${rating === 1 ? "!border-lamp text-lamp" : ""}`} onClick={() => rate(t.id, 1)} aria-pressed={rating === 1} aria-label="Gostei" title="Gostei">
                <ThumbsUp size={20} />
              </button>
              <button className={`icon-btn !h-[52px] !w-[52px] ${rating === -1 ? "!border-ember text-ember" : ""}`} onClick={() => rate(t.id, -1)} aria-pressed={rating === -1} aria-label="Não é pra mim" title="Não é pra mim">
                <ThumbsDown size={20} />
              </button>
              <button className="icon-btn !h-[52px] !w-[52px]" onClick={share} aria-label="Compartilhar" title="Compartilhar">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {publicDomain && (
            <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-mute">
              Obra completa em domínio público, exibida a partir do acervo do Internet Archive (archive.org).
            </p>
          )}
          {playbackIsDemo && (
            <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-mute">
              Ao assistir, toca o vídeo de demonstração da Lanterna. Exibir a obra completa exige uma fonte de vídeo licenciada, cadastrada no painel.
            </p>
          )}

          <p className="mt-6 max-w-[68ch] text-[16px] leading-[1.7] text-paper/85">{t.synopsis}</p>

          <dl className="mt-8 grid gap-x-10 gap-y-5 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Elenco">{t.cast.map((c) => (c.role ? `${c.name} (${c.role})` : c.name)).join(", ")}</Info>
            <Info label={t.kind === "series" ? "Criação" : "Direção"}>{t.directors.join(", ")}</Info>
            <Info label="Gêneros">{t.genres.join(", ")}</Info>
            <Info label="País de origem">{t.country}</Info>
            {t.awards && <Info label="Prêmios">{t.awards}</Info>}
            <Info label="Áudio">{t.languages.join(", ")}</Info>
            <Info label="Legendas">{t.subtitles.length ? t.subtitles.join(", ") : "Indisponível"}</Info>
            {t.kind === "movie" && <Info label="Duração">{formatDuration(t.durationMin)}</Info>}
          </dl>
        </motion.div>
      </div>

      {t.kind === "series" && t.seasons?.length ? <Episodes title={t} /> : null}

      <div className="mt-14">
        <MovieCarousel title="Títulos semelhantes" items={similar} />
      </div>

      <AnimatePresence>
        {trailer && <TrailerModal title={t} onClose={() => setTrailer(false)} />}
      </AnimatePresence>
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="mb-1 font-semibold text-mute">{label}</dt>
      <dd className="leading-relaxed text-paper/90">{children}</dd>
    </div>
  );
}

function Episodes({ title: t }: { title: Title }) {
  const { library } = useApp();
  const { play } = useTitleActions();
  const latest = library.progress.find((p) => p.titleId === t.id);
  const [season, setSeason] = useState(latest?.season ?? t.seasons![0].number);
  useEffect(() => { setSeason(latest?.season ?? t.seasons![0].number); }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = t.seasons!.find((x) => x.number === season) ?? t.seasons![0];
  const progressByEp = useMemo(() => new Map(library.progress.filter((p) => p.titleId === t.id).map((p) => [p.episodeId, p])), [library.progress, t.id]);

  return (
    <section className="page-x mt-14" aria-labelledby="episodes-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <h2 id="episodes-title" className="font-display text-4xl font-bold">Episódios</h2>
        {t.seasons!.length > 1 ? (
          <label className="relative">
            <span className="sr-only">Temporada</span>
            <select value={season} onChange={(e) => setSeason(Number(e.target.value))} className="field min-h-[44px] appearance-none pr-10 font-semibold">
              {t.seasons!.map((x) => <option key={x.number} value={x.number}>Temporada {x.number} ({x.episodes.length} episódios)</option>)}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mute" />
          </label>
        ) : (
          <p className="text-sm font-semibold text-mute">Temporada {s.number}, {s.year}</p>
        )}
      </div>
      {(t.seasonCount ?? 0) > t.seasons!.length && (
        <p className="mb-4 text-sm text-mute">A série tem {t.seasonCount} temporadas; este catálogo traz a temporada {t.seasons!.map((x) => x.number).join(", ")} como amostra.</p>
      )}
      {s.totalEpisodes && s.totalEpisodes > s.episodes.length && (
        <p className="mb-4 text-sm text-mute">Mostrando {s.episodes.length} de {s.totalEpisodes} episódios desta temporada.</p>
      )}
      <AnimatePresence mode="wait">
        <motion.ol key={season} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/70 bg-surface/60">
          {s.episodes.map((e) => (
            <EpisodeRow key={e.id} t={t} e={e} progress={progressByEp.get(e.id)} current={latest?.episodeId === e.id} onPlay={() => play(t, e.id)} />
          ))}
        </motion.ol>
      </AnimatePresence>
    </section>
  );
}

function EpisodeRow({ t, e, progress, current, onPlay }: { t: Title; e: Episode; progress?: { position: number; duration: number; finished: boolean }; current: boolean; onPlay: () => void }) {
  const ratio = progress ? Math.min(1, progress.position / Math.max(1, progress.duration)) : 0;
  return (
    <li className={`group ${current ? "bg-paper/[.04]" : ""}`}>
      <button onClick={onPlay} className="flex w-full items-start gap-4 p-3 text-left transition hover:bg-paper/[.05] sm:items-center sm:gap-5 sm:p-4" aria-label={`Assistir episódio ${e.number}: ${e.title}`}>
        <span className="hidden w-6 shrink-0 text-center font-display text-3xl font-bold text-mute sm:block">{e.number}</span>
        <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-raised sm:w-48">
          <img
            src={e.thumbnail ?? t.backdrop}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            style={e.thumbnail ? undefined : { objectPosition: `${e.thumbFocus ?? 50}% center`, transform: "scale(1.6)", filter: `hue-rotate(${((e.number * 17) % 40) - 20}deg) saturate(1.05)` }}
          />
          <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-paper/70 bg-black/40"><Play size={18} className="ml-0.5 fill-paper" /></span>
          </span>
          {progress?.finished && (
            <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-ok">
              <Check size={11} /> Assistido
            </span>
          )}
          {progress && !progress.finished && (
            <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/30"><span className="block h-full bg-lamp" style={{ width: `${Math.max(4, ratio * 100)}%` }} /></span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-bold text-paper"><span className="text-mute sm:hidden">{e.number}. </span>{e.title}</span>
            <span className="shrink-0 text-sm text-mute">{e.durationMin} min</span>
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-paper/70">{e.synopsis}</span>
        </span>
      </button>
    </li>
  );
}

function TrailerModal({ title: t, onClose }: { title: Title; onClose: () => void }) {
  const { sources } = useApp();
  const source = sources.find((s) => s.id === t.trailerSourceId);
  const [prefs, setPrefs] = useState({ quality: "auto", subtitleLang: "off", audioLang: "orig" });
  return (
    <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-black/85 p-0 backdrop-blur-sm sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Trailer de ${t.title}`}
        className="aspect-video w-full max-w-5xl overflow-hidden bg-black sm:rounded-2xl"
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {t.trailerYoutubeKey ? (
          <div className="relative h-full w-full">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${t.trailerYoutubeKey}?autoplay=1&rel=0`}
              title={`Trailer de ${t.title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
            <button onClick={onClose} className="icon-btn absolute right-3 top-3" aria-label="Fechar trailer">✕</button>
          </div>
        ) : source ? (
          <VideoPlayer source={source} title={`Trailer: ${t.title}`} subtitle="Prévia de demonstração" prefs={prefs} onPrefsChange={setPrefs} onExit={onClose} mode="trailer" />
        ) : null}
      </motion.div>
    </motion.div>
  );
}
