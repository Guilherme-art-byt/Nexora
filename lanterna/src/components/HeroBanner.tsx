import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Info, Pause, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTitleActions } from "@/hooks";
import { displayTitleSize, titleLength } from "@/lib/format";
import { useApp } from "@/store/app";
import type { Title } from "@/types";
import { RatingBadge, Score } from "./ui";

const INTERVAL = 8000;

export function HeroBanner({ items }: { items: Title[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduce = useReducedMotion();
  const { inList, toggleList, library } = useApp();
  const { open, play } = useTitleActions();
  const t = items[index % items.length];

  useEffect(() => {
    if (paused || userPaused || items.length < 2) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, paused, userPaused, items.length]);

  useEffect(() => {
    const vis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  if (!t) return null;
  const progress = library.progress.find((p) => p.titleId === t.id);
  const resumeLabel = progress && !progress.finished
    ? t.kind === "series" && progress.season ? `Continuar T${progress.season}:E${progress.episode}` : "Continuar"
    : "Assistir agora";

  return (
    <section
      className="relative h-[86svh] max-h-[880px] min-h-[560px] w-full overflow-hidden sm:h-[84vh]"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={t.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        >
          <motion.img
            src={t.backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
            initial={{ scale: reduce ? 1 : 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: reduce ? 0 : 9, ease: "linear" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* gradientes para leitura */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent sm:via-ink/45" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/80 to-transparent" />

      {/* feixe do projetor: o único gesto dramático da página */}
      <div aria-hidden className="pointer-events-none absolute -left-[10%] -top-[30%] h-[160%] w-[85%] origin-top-left rotate-[8deg] opacity-[.16] mix-blend-screen [background:linear-gradient(105deg,rgba(240,168,58,.9)_0%,rgba(240,168,58,.25)_35%,transparent_70%)] [clip-path:polygon(0_0,18%_0,100%_100%,0_70%)] motion-safe:animate-[flicker_6s_ease-in-out_infinite]" />

      <div className="page-x relative z-10 flex h-full flex-col justify-end pb-32 sm:pb-36 lg:pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
            className="max-w-[640px]"
          >
            {t.original && <p className="mb-3 text-sm font-bold text-lamp">Original Lanterna</p>}
            <h1 className={`display ${displayTitleSize(t.title, "hero")} uppercase text-paper [text-shadow:0_4px_40px_rgba(0,0,0,.5)] [text-wrap:balance]`}>{t.title}</h1>
            {t.tagline && <p className="mt-3 text-lg font-semibold text-paper/90 sm:text-xl">{t.tagline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-paper/85">
              <Score value={t.score} />
              <span>{t.year}</span>
              <RatingBadge rating={t.rating} />
              <span>{titleLength(t)}</span>
              <span className="text-mute">{t.genres.slice(0, 3).join(", ")}</span>
            </div>
            <p className="mt-4 line-clamp-2 max-w-[56ch] text-[15px] sm:line-clamp-3 leading-relaxed text-paper/80 sm:text-base">{t.synopsis}</p>
            <div className="mt-6 flex items-center gap-2 sm:gap-3">
              <button className="btn-light min-h-[50px] min-w-0 flex-1 whitespace-nowrap px-3 text-base sm:flex-none sm:px-7" onClick={() => play(t)}>
                <Play size={20} className="shrink-0 fill-ink" /> <span className="truncate">{resumeLabel === "Assistir agora" ? <><span className="sm:hidden">Assistir</span><span className="hidden sm:inline">Assistir agora</span></> : resumeLabel}</span>
              </button>
              <button className="btn-glass min-h-[50px] min-w-0 flex-1 whitespace-nowrap px-3 text-base sm:flex-none sm:px-6" onClick={() => open(t)}>
                <Info size={20} className="shrink-0" /> <span className="sm:hidden">Detalhes</span><span className="hidden sm:inline">Mais informações</span>
              </button>
              <button
                className="icon-btn !h-[50px] !w-[50px]"
                onClick={() => toggleList(t.id)}
                aria-label={inList(t.id) ? "Remover da Minha Lista" : "Adicionar à Minha Lista"}
                title={inList(t.id) ? "Na Minha Lista" : "Adicionar à Minha Lista"}
              >
                {inList(t.id) ? <Check size={22} className="text-lamp" /> : <Plus size={22} />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length > 1 && (
        <div className="page-x absolute bottom-[5.5rem] left-0 right-0 z-10 flex items-center gap-2 sm:bottom-24 sm:justify-end">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => setIndex(i)}
              className="group relative h-6 flex-1 sm:max-w-[72px]"
              aria-label={`Destaque ${i + 1}: ${it.title}`}
              aria-current={i === index}
            >
              <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-paper/25 transition group-hover:bg-paper/45">
                {i === index && (
                  <motion.span
                    key={`${it.id}-${paused || userPaused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-lamp"
                    initial={{ width: paused || userPaused ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: paused || userPaused ? 0 : INTERVAL / 1000, ease: "linear" }}
                  />
                )}
                {i < index && <span className="absolute inset-0 bg-paper/60" />}
              </span>
            </button>
          ))}
          <button
            onClick={() => setUserPaused((v) => !v)}
            className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper"
            aria-label={userPaused ? "Retomar rotação dos destaques" : "Pausar rotação dos destaques"}
          >
            {userPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      )}
    </section>
  );
}
