import { Play, X } from "lucide-react";
import { useMemo } from "react";
import { useTitleActions } from "@/hooks";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { ProgressEntry, Title } from "@/types";
import { MovieCarousel } from "./MovieCarousel";

/** Progresso mais recente de cada título (a lista já vem ordenada do mais novo para o mais antigo). */
export function latestPerTitle(progress: ProgressEntry[]) {
  const seen = new Set<string>();
  return progress.filter((p) => (seen.has(p.titleId) ? false : (seen.add(p.titleId), true)));
}

export function useContinueWatching() {
  const { library, getTitle, titles } = useApp();
  const visible = useMemo(() => new Set(titles.map((t) => t.id)), [titles]);
  return useMemo(
    () =>
      latestPerTitle(library.progress)
        .filter((p) => !p.finished && p.position > 2 && visible.has(p.titleId))
        .map((p) => ({ p, t: getTitle(p.titleId) }))
        .filter((x): x is { p: ProgressEntry; t: Title } => !!x.t),
    [library.progress, getTitle, visible],
  );
}

export function ContinueWatching() {
  const items = useContinueWatching();
  const byId = useMemo(() => new Map(items.map((x) => [x.t.id, x.p])), [items]);
  if (!items.length) return null;
  return (
    <MovieCarousel
      title="Continue assistindo"
      items={items.map((x) => x.t)}
      itemClass="w-[72vw] xs:w-[56vw] sm:w-[40vw] md:w-[30vw] lg:w-[24vw] xl:w-[21vw]"
      renderItem={(t) => <ContinueCard title={t} progress={byId.get(t.id)!} />}
    />
  );
}

export function ContinueCard({ title: t, progress: p }: { title: Title; progress: ProgressEntry }) {
  const { play, open } = useTitleActions();
  const { removeProgress } = useApp();
  const { confirm } = useUI();
  const ratio = Math.min(1, p.position / Math.max(1, p.duration));
  const ep = t.seasons?.find((s) => s.number === p.season)?.episodes.find((e) => e.id === p.episodeId);
  const nominal = (t.kind === "movie" ? t.durationMin : ep?.durationMin) ?? p.duration / 60;
  const remainingMin = Math.max(1, Math.round((1 - ratio) * nominal));

  const remove = async () => {
    if (await confirm({ title: `Remover ${t.title}?`, body: "O título sai de Continuar assistindo e o progresso salvo é apagado.", confirmLabel: "Remover", danger: true })) {
      removeProgress(t.id);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-line/60 bg-surface">
      <button onClick={() => play(t, p.episodeId)} className="relative block aspect-video w-full overflow-hidden" aria-label={`Continuar ${t.title}`}>
        <img src={t.backdrop} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" style={ep?.thumbFocus !== undefined ? { objectPosition: `${ep.thumbFocus}% center` } : undefined} />
        <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-paper/50 bg-ink/50 text-paper opacity-90 backdrop-blur transition group-hover:scale-110 group-hover:border-lamp group-hover:text-lamp">
          <Play size={20} className="ml-0.5 fill-current" />
        </span>
        <span className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded-full bg-white/25">
          <span className="block h-full rounded-full bg-lamp" style={{ width: `${Math.max(3, ratio * 100)}%` }} />
        </span>
      </button>
      <div className="flex items-start justify-between gap-2 p-3">
        <button className="min-w-0 text-left" onClick={() => open(t)}>
          <p className="truncate font-bold text-paper">{t.title}</p>
          <p className="truncate text-xs text-mute">
            {p.season ? `T${p.season}:E${p.episode} ${ep?.title ?? ""}` : "Filme"} <span className="text-paper/60">restam {remainingMin} min</span>
          </p>
        </button>
        <button onClick={remove} className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute hover:bg-paper/10 hover:text-paper" aria-label={`Remover ${t.title} de Continuar assistindo`} title="Remover">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
