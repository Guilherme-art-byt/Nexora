import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Play, Plus, ThumbsUp } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCanHover, useTitleActions } from "@/hooks";
import { titleLength } from "@/lib/format";
import { useApp } from "@/store/app";
import type { Title } from "@/types";
import { RatingBadge, Score } from "./ui";

interface Props {
  title: Title;
  rank?: number;
  progress?: number; // 0–1
  sizes?: string;
  showMeta?: boolean;
}

function MovieCardBase({ title: t, rank, progress, showMeta = true }: Props) {
  const canHover = useCanHover();
  const { open } = useTitleActions();
  const ref = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timer = useRef<number>();

  const enter = () => {
    if (!canHover) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ref.current && setRect(ref.current.getBoundingClientRect()), 420);
  };
  const leave = () => window.clearTimeout(timer.current);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="group relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        ref={ref}
        onClick={() => open(t)}
        className="relative block w-full overflow-hidden rounded-xl bg-surface text-left ring-1 ring-white/5 transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-lamp active:scale-[.98]"
        aria-label={`${t.title}, ${t.kind === "movie" ? "filme" : "série"} de ${t.year}. Abrir detalhes`}
      >
        <div className="relative aspect-[2/3] w-full">
          <img src={t.poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
            <p className="font-display text-[19px] font-extrabold leading-[.95] text-paper drop-shadow sm:text-[22px]">{t.title}</p>
          </div>
          {t.original && (
            <span className="absolute left-2 top-2 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-lamp backdrop-blur">Original Lanterna</span>
          )}
          {rank !== undefined && (
            <span className="absolute right-2 top-1 font-display text-5xl font-black leading-none text-paper/95 [text-shadow:0_2px_12px_rgba(0,0,0,.7)]">{rank}</span>
          )}
          {progress !== undefined && (
            <div className="absolute inset-x-2.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-lamp" style={{ width: `${Math.max(3, progress * 100)}%` }} />
            </div>
          )}
        </div>
      </button>
      {showMeta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-0.5 text-xs text-mute">
          <span>{t.year}</span>
          <Score value={t.score} className="text-xs" />
          <span className="truncate">{t.genres[0]}</span>
          <span className="hidden truncate sm:inline">{titleLength(t)}</span>
        </div>
      )}
      {createPortal(
        <AnimatePresence>{rect && <HoverPreview title={t} rect={rect} onClose={() => setRect(null)} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

export const MovieCard = memo(MovieCardBase);

function HoverPreview({ title: t, rect, onClose }: { title: Title; rect: DOMRect; onClose: () => void }) {
  const { inList, toggleList, rate, library } = useApp();
  const { open, play } = useTitleActions();
  const liked = library.ratings.find((r) => r.titleId === t.id)?.value === 1;

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  const width = Math.max(300, rect.width * 1.9);
  const vw = document.documentElement.clientWidth;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
  const top = Math.max(12, rect.top + rect.height * 0.18 - 40);

  return (
    <motion.div
      onMouseLeave={onClose}
      initial={{ opacity: 0, scale: 0.86, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      style={{ position: "fixed", left, top, width, zIndex: 70, transformOrigin: `${rect.left + rect.width / 2 - left}px 30%` }}
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,.95)]"
    >
      <button className="relative block aspect-video w-full" onClick={() => open(t)} aria-label={`Abrir ${t.title}`}>
        <img src={t.backdrop} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
        <p className="absolute bottom-2 left-4 right-4 font-display text-3xl font-extrabold leading-none text-paper">{t.title}</p>
      </button>
      <div className="space-y-3 p-4 pt-2">
        <div className="flex items-center gap-2">
          <button onClick={() => play(t)} className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink transition hover:bg-white" aria-label={`Assistir ${t.title}`}>
            <Play size={18} className="ml-0.5 fill-ink" />
          </button>
          <button onClick={() => toggleList(t.id)} className="icon-btn !h-10 !w-10" aria-label={inList(t.id) ? "Remover da Minha Lista" : "Adicionar à Minha Lista"} title={inList(t.id) ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}>
            {inList(t.id) ? <Check size={18} /> : <Plus size={18} />}
          </button>
          <button onClick={() => rate(t.id, 1)} className={`icon-btn !h-10 !w-10 ${liked ? "!border-lamp text-lamp" : ""}`} aria-label="Gostei" aria-pressed={liked} title="Gostei">
            <ThumbsUp size={16} className={liked ? "fill-lamp/30" : ""} />
          </button>
          <button onClick={() => open(t)} className="icon-btn ml-auto !h-10 !w-10" aria-label="Mais informações" title="Mais informações">
            <ChevronDown size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
          <Score value={t.score} />
          <RatingBadge rating={t.rating} />
          <span className="text-paper/90">{t.year}</span>
          <span className="text-mute">{titleLength(t)}</span>
          <span className="rounded border border-paper/30 px-1 text-[10px] font-bold text-paper/80">HD</span>
        </div>
        <p className="line-clamp-3 text-[13px] leading-relaxed text-paper/80">{t.synopsis}</p>
        <p className="text-[12px] text-mute">{t.genres.join(", ")}</p>
      </div>
    </motion.div>
  );
}
