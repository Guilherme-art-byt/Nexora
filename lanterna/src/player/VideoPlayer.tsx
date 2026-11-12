import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Captions, Check, Gauge, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Settings2, SkipForward, Volume1, Volume2, VolumeX, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import { load, save } from "@/lib/storage";
import type { VideoSource } from "@/types";
import { parseVtt, type Cue } from "./sources";

export interface PlayerPrefs { quality: string; subtitleLang: string; audioLang: string }

interface Props {
  source: VideoSource;
  title: string;
  subtitle?: string;
  startAt?: number;
  autoPlay?: boolean;
  prefs: PlayerPrefs;
  onPrefsChange?: (p: PlayerPrefs) => void;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
  onExit: () => void;
  next?: { label: string; autoplay: boolean; onPlay: () => void };
  mode?: "full" | "trailer";
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_AFTER = 3000;

export function VideoPlayer({ source, title, subtitle, startAt = 0, autoPlay = true, prefs, onPrefsChange, onProgress, onEnded, onExit, next, mode = "full" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const hideTimer = useRef<number>();
  const pendingSeek = useRef<{ time: number; play: boolean } | null>(startAt > 2 ? { time: startAt, play: autoPlay } : null);
  const lastTap = useRef<{ t: number; x: number }>({ t: 0, x: 0 });

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => load("player:volume", 0.8));
  const [muted, setMuted] = useState(() => load("player:muted", false));
  const [rate, setRate] = useState(1);
  const [controls, setControls] = useState(true);
  const [panel, setPanel] = useState<null | "settings">(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [resumeNote, setResumeNote] = useState(startAt > 2);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [flash, setFlash] = useState<{ id: number; icon: "fwd" | "back" | "play" | "pause" } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // ---------------------------------------------------------- seleção de faixas
  const autoQuality = useMemo(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = conn?.saveData || (conn?.effectiveType && /2g|3g/.test(conn.effectiveType));
    const wide = Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1) > 1100;
    const sorted = [...source.renditions].sort((a, b) => b.height - a.height);
    return (!slow && wide ? sorted[0] : sorted[sorted.length - 1]) ?? sorted[0];
  }, [source.renditions]);
  const rendition = source.renditions.find((r) => r.label === prefs.quality) ?? autoQuality;
  const audioTrack = source.audio.find((a) => a.id === prefs.audioLang) ?? source.audio[0];
  const externalAudio = !!audioTrack?.src;
  const subTrack = source.subtitles.find((s) => s.lang === prefs.subtitleLang);
  const cues = useMemo<Cue[]>(() => (subTrack ? parseVtt(subTrack.vtt) : []), [subTrack]);
  const activeCue = cues.find((c) => time >= c.start && time <= c.end);

  const setPrefs = (patch: Partial<PlayerPrefs>) => onPrefsChange?.({ ...prefs, ...patch });

  // ---------------------------------------------------------- visibilidade dos controles
  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!video.current?.paused) { setControls(false); setPanel(null); }
    }, HIDE_AFTER);
  }, []);

  useEffect(() => { poke(); return () => window.clearTimeout(hideTimer.current); }, [poke]);
  useEffect(() => { if (!playing) setControls(true); else poke(); }, [playing, poke]);

  // ---------------------------------------------------------- volume e trilha externa
  useEffect(() => {
    const v = video.current, a = audio.current;
    if (!v) return;
    v.muted = externalAudio ? true : muted;
    v.volume = volume;
    if (a) { a.volume = volume; a.muted = muted; }
    save("player:volume", volume);
    save("player:muted", muted);
  }, [volume, muted, externalAudio]);

  const syncAudio = useCallback((force = false) => {
    const v = video.current, a = audio.current;
    if (!v || !a || !externalAudio) return;
    if (force || Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
    a.playbackRate = v.playbackRate;
    if (v.paused || v.ended) a.pause();
    else if (a.paused) a.play().catch(() => undefined);
  }, [externalAudio]);

  // troca de qualidade ou de áudio preserva tempo e estado
  const lastState = useRef({ time: startAt, playing: autoPlay });
  const prevSrc = useRef(rendition.src);
  if (prevSrc.current !== rendition.src) {
    // a troca acontece antes de o elemento antigo ser desmontado, preservando tempo e estado
    prevSrc.current = rendition.src;
    pendingSeek.current = { time: lastState.current.time, play: lastState.current.playing };
  }
  useEffect(() => { setLoading(true); setError(null); }, [rendition.src]);

  useEffect(() => { syncAudio(true); }, [audioTrack?.src, syncAudio]);

  // ---------------------------------------------------------- ações
  const togglePlay = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) v.play().catch(() => setError("O navegador bloqueou a reprodução. Toque em reproduzir para começar."));
    else v.pause();
    setFlash({ id: Date.now(), icon: v.paused ? "play" : "pause" });
    setResumeNote(false);
  }, []);

  const seekBy = useCallback((d: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.1, v.currentTime + d));
    setFlash({ id: Date.now(), icon: d > 0 ? "fwd" : "back" });
    poke();
  }, [poke]);

  const seekTo = (t: number) => {
    const v = video.current;
    if (v) v.currentTime = t;
  };

  const toggleFullscreen = useCallback(async () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else v?.webkitEnterFullscreen?.(); // iPhone
    } catch { /* recusado pelo navegador */ }
  }, []);

  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    onExit();
  }, [onExit]);

  const cycleSubtitles = useCallback(() => {
    const langs = ["off", ...source.subtitles.map((s) => s.lang)];
    const i = langs.indexOf(prefs.subtitleLang);
    onPrefsChange?.({ ...prefs, subtitleLang: langs[(i + 1) % langs.length] });
  }, [onPrefsChange, prefs, source.subtitles]);

  // ---------------------------------------------------------- teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const handled = true;
      switch (e.key) {
        case " ": case "k": case "K": togglePlay(); break;
        case "ArrowRight": case "l": seekBy(10); break;
        case "ArrowLeft": case "j": seekBy(-10); break;
        case "ArrowUp": setVolume((v) => Math.min(1, +(v + 0.1).toFixed(2))); setMuted(false); break;
        case "ArrowDown": setVolume((v) => Math.max(0, +(v - 0.1).toFixed(2))); break;
        case "m": case "M": setMuted((m) => !m); break;
        case "f": case "F": toggleFullscreen(); break;
        case "c": case "C": cycleSubtitles(); break;
        case "n": case "N": next?.onPlay(); break;
        case "Escape": if (panel) setPanel(null); else if (!document.fullscreenElement) exit(); break;
        default: return;
      }
      if (handled) { e.preventDefault(); poke(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen, cycleSubtitles, next, panel, exit, poke]);

  // ---------------------------------------------------------- próximo episódio
  const nearEnd = !!next && duration > 0 && duration - time < Math.min(8, duration * 0.3);
  useEffect(() => {
    if (!nearEnd || !next?.autoplay || !playing) { setCountdown(null); return; }
    setCountdown((c) => c ?? Math.ceil(duration - time) + 4);
  }, [nearEnd, next?.autoplay, playing, duration, time]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { next?.onPlay(); return; }
    const id = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [countdown, next]);

  // ---------------------------------------------------------- toque (duplo toque = ±10 s)
  const onSurfacePointer = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") { togglePlay(); return; }
    const now = Date.now();
    const rect = box.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (now - lastTap.current.t < 300) {
      seekBy(x < rect.width / 2 ? -10 : 10);
      lastTap.current = { t: 0, x };
      return;
    }
    lastTap.current = { t: now, x };
    window.setTimeout(() => {
      if (lastTap.current.t === now) controls ? (setControls(false), setPanel(null)) : poke();
    }, 300);
  };

  const pct = duration ? (time / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showUI = controls || !playing || !!panel;

  return (
    <div
      ref={box}
      className={`relative h-full w-full select-none overflow-hidden bg-black text-paper ${showUI ? "" : "cursor-none"}`}
      onPointerMove={(e) => e.pointerType === "mouse" && poke()}
      role="region"
      aria-label={`Player: ${title}`}
    >
      <video
        ref={video}
        key={rendition.src}
        src={rendition.src}
        className="absolute inset-0 h-full w-full object-contain"
        playsInline
        preload="auto"
        autoPlay={autoPlay}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          v.playbackRate = rate;
          if (pendingSeek.current) {
            v.currentTime = Math.min(pendingSeek.current.time, Math.max(0, v.duration - 1));
            if (pendingSeek.current.play) v.play().catch(() => undefined);
            pendingSeek.current = null;
          }
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); setPlaying(true); syncAudio(true); }}
        onPlay={() => { setPlaying(true); lastState.current.playing = true; syncAudio(); }}
        onPause={(e) => { setPlaying(false); syncAudio(); if (!pendingSeek.current) lastState.current.playing = false; onProgress?.(e.currentTarget.currentTime, e.currentTarget.duration); }}
        onSeeked={() => syncAudio(true)}
        onRateChange={() => syncAudio()}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          if (!pendingSeek.current) lastState.current.time = v.currentTime;
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          syncAudio();
          onProgress?.(v.currentTime, v.duration);
        }}
        onEnded={() => { setPlaying(false); syncAudio(); onProgress?.(duration, duration); onEnded?.(); }}
        onError={() => { setLoading(false); setError("Não foi possível carregar este vídeo. Verifique a fonte configurada ou tente outra qualidade."); }}
      />
      {externalAudio && <audio ref={audio} key={audioTrack.src} src={audioTrack.src} preload="auto" onLoadedMetadata={() => syncAudio(true)} />}

      {/* superfície de toque/clique */}
      <div className="absolute inset-0" onPointerUp={onSurfacePointer} onDoubleClick={(e) => { e.preventDefault(); toggleFullscreen(); }} aria-hidden />

      {/* legendas */}
      {activeCue && (
        <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-6 transition-[bottom] duration-200 ${showUI ? "bottom-28 sm:bottom-32" : "bottom-10"}`}>
          <p className="max-w-3xl whitespace-pre-line rounded-md bg-black/75 px-3 py-1.5 text-center text-[clamp(15px,2.4vw,26px)] font-semibold leading-snug text-white">{activeCue.text}</p>
        </div>
      )}

      {/* carregando / erro */}
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="h-14 w-14 animate-spin rounded-full border-[3px] border-paper/20 border-t-lamp" aria-label="Carregando" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6">
          <div className="max-w-sm text-center">
            <p className="font-semibold">{error}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn-primary" onClick={() => { setError(null); video.current?.load(); video.current?.play().catch(() => undefined); }}>Tentar novamente</button>
              <button className="btn-glass" onClick={exit}>Sair</button>
            </div>
          </div>
        </div>
      )}

      {/* feedback central */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0.9, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.6 }}
            onAnimationComplete={() => setFlash(null)}
            className={`pointer-events-none absolute top-1/2 grid h-20 w-20 -translate-y-1/2 place-items-center rounded-full bg-black/50 ${flash.icon === "back" ? "left-[18%]" : flash.icon === "fwd" ? "right-[18%]" : "left-1/2 -translate-x-1/2"}`}
          >
            {flash.icon === "play" && <Play size={34} className="fill-paper" />}
            {flash.icon === "pause" && <Pause size={34} className="fill-paper" />}
            {flash.icon === "fwd" && <span className="flex flex-col items-center text-xs font-bold"><RotateCw size={28} />10 s</span>}
            {flash.icon === "back" && <span className="flex flex-col items-center text-xs font-bold"><RotateCcw size={28} />10 s</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* camada de controles */}
      <AnimatePresence>
        {showUI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            {/* topo */}
            <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-3 px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-6">
              <button onClick={exit} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label="Sair do player (Esc)">
                {mode === "trailer" ? <X size={24} /> : <ArrowLeft size={26} />}
              </button>
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-extrabold leading-none sm:text-3xl">{title}</p>
                {subtitle && <p className="truncate text-sm text-paper/70">{subtitle}</p>}
              </div>
            </div>

            {/* centro: botões grandes no toque */}
            <div className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-8 sm:hidden">
              <button onClick={() => seekBy(-10)} className="grid h-14 w-14 place-items-center rounded-full bg-black/40" aria-label="Voltar 10 segundos"><RotateCcw size={26} /></button>
              <button onClick={togglePlay} className="grid h-[72px] w-[72px] place-items-center rounded-full bg-black/50" aria-label={playing ? "Pausar" : "Reproduzir"}>
                {playing ? <Pause size={34} className="fill-paper" /> : <Play size={34} className="ml-1 fill-paper" />}
              </button>
              <button onClick={() => seekBy(10)} className="grid h-14 w-14 place-items-center rounded-full bg-black/40" aria-label="Avançar 10 segundos"><RotateCw size={26} /></button>
            </div>

            {/* aviso de retomada */}
            {resumeNote && (
              <div className="pointer-events-auto absolute left-3 top-24 flex items-center gap-3 rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-sm backdrop-blur sm:left-6">
                <span>Retomando de {formatClock(startAt)}</span>
                <button className="font-bold text-lamp hover:underline" onClick={() => { seekTo(0); setResumeNote(false); }}>Começar do início</button>
                <button onClick={() => setResumeNote(false)} aria-label="Fechar aviso" className="text-paper/60 hover:text-paper"><X size={16} /></button>
              </div>
            )}

            {/* base */}
            <div className="pointer-events-auto absolute inset-x-0 bottom-0 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
              {/* barra de progresso */}
              <div
                className="group relative flex items-center"
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                  setHover({ x: ratio * r.width, t: ratio * duration });
                }}
                onPointerLeave={() => setHover(null)}
              >
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={time}
                  onChange={(e) => { seekTo(Number(e.target.value)); setResumeNote(false); poke(); }}
                  className="range relative w-full"
                  style={{ ["--fill" as string]: `${pct}%` }}
                  aria-label="Posição do vídeo"
                  aria-valuetext={`${formatClock(time)} de ${formatClock(duration)}`}
                />
                {hover && duration > 0 && (
                  <span className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-black/85 px-2 py-0.5 text-xs font-semibold" style={{ left: hover.x }}>{formatClock(hover.t)}</span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1 sm:gap-2">
                <button onClick={togglePlay} className="hidden h-11 w-11 place-items-center rounded-full hover:bg-white/10 sm:grid" aria-label={playing ? "Pausar (espaço)" : "Reproduzir (espaço)"}>
                  {playing ? <Pause size={26} className="fill-paper" /> : <Play size={26} className="fill-paper" />}
                </button>
                <button onClick={() => seekBy(-10)} className="hidden h-11 w-11 place-items-center rounded-full hover:bg-white/10 sm:grid" aria-label="Voltar 10 segundos"><RotateCcw size={22} /></button>
                <button onClick={() => seekBy(10)} className="hidden h-11 w-11 place-items-center rounded-full hover:bg-white/10 sm:grid" aria-label="Avançar 10 segundos"><RotateCw size={22} /></button>
                <div className="group/vol flex items-center">
                  <button onClick={() => setMuted((m) => !m)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label={muted ? "Ativar som (M)" : "Silenciar (M)"}>
                    <VolIcon size={22} />
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={(e) => { setVolume(Number(e.target.value)); setMuted(Number(e.target.value) === 0); }}
                    className="range w-0 opacity-0 transition-all duration-200 focus:w-24 focus:opacity-100 group-hover/vol:w-24 group-hover/vol:opacity-100"
                    style={{ ["--fill" as string]: `${(muted ? 0 : volume) * 100}%` }}
                    aria-label="Volume"
                  />
                </div>
                <span className="ml-1 text-xs tabular-nums text-paper/85 sm:text-sm">{formatClock(time)} / {formatClock(duration)}</span>

                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                  {next && (
                    <button onClick={next.onPlay} className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white/10 sm:flex" aria-label={`Próximo episódio: ${next.label} (N)`}>
                      <SkipForward size={20} className="fill-paper" /> <span className="hidden md:inline">Próximo episódio</span>
                    </button>
                  )}
                  <button onClick={cycleSubtitles} className={`grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 ${prefs.subtitleLang !== "off" ? "text-lamp" : ""}`} aria-label={`Legendas: ${subTrack?.label ?? "desligadas"} (C)`} title="Legendas">
                    <Captions size={22} />
                  </button>
                  <button onClick={() => setPanel((p) => (p ? null : "settings"))} className={`grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 ${panel ? "bg-white/10" : ""}`} aria-label="Configurações de reprodução" aria-expanded={!!panel}>
                    <Settings2 size={22} />
                  </button>
                  <button onClick={toggleFullscreen} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label={fullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}>
                    {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* painel de configurações */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-24 right-3 z-10 max-h-[60vh] w-[min(560px,calc(100%-24px))] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0e13]/95 p-4 backdrop-blur-xl sm:right-6"
            role="dialog"
            aria-label="Configurações de reprodução"
            onPointerMove={poke}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <OptionGroup
                label="Qualidade"
                options={[{ v: "auto", l: `Automática (${autoQuality.label})` }, ...source.renditions.map((r) => ({ v: r.label, l: r.label + (r.height >= 720 ? " HD" : "") }))]}
                value={prefs.quality === "auto" || !source.renditions.some((r) => r.label === prefs.quality) ? "auto" : prefs.quality}
                onPick={(v) => setPrefs({ quality: v })}
              />
              <OptionGroup
                label="Áudio"
                options={source.audio.map((a) => ({ v: a.id, l: a.label }))}
                value={audioTrack?.id ?? ""}
                onPick={(v) => setPrefs({ audioLang: v })}
              />
              <OptionGroup
                label="Legendas"
                options={[{ v: "off", l: "Desligadas" }, ...source.subtitles.map((s) => ({ v: s.lang, l: s.label }))]}
                value={subTrack ? subTrack.lang : "off"}
                onPick={(v) => setPrefs({ subtitleLang: v })}
              />
              <OptionGroup
                label="Velocidade"
                icon={<Gauge size={15} />}
                options={SPEEDS.map((s) => ({ v: String(s), l: s === 1 ? "Normal" : `${s.toString().replace(".", ",")}x` }))}
                value={String(rate)}
                onPick={(v) => { const r = Number(v); setRate(r); if (video.current) video.current.playbackRate = r; }}
              />
            </div>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-paper/50">
              Atalhos: espaço reproduz ou pausa, setas avançam e ajustam o volume, F tela cheia, C legendas, M silencia{next ? ", N próximo episódio" : ""}, Esc sai.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* próximo episódio */}
      <AnimatePresence>
        {nearEnd && next && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute bottom-28 right-3 z-10 w-72 rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-xl sm:right-6">
            <p className="text-xs font-semibold text-paper/60">Próximo episódio</p>
            <p className="mt-1 truncate font-bold">{next.label}</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-light flex-1 min-h-[40px]" onClick={next.onPlay}>
                <Play size={16} className="fill-ink" /> {countdown !== null ? `Assistir em ${countdown}` : "Assistir"}
              </button>
              {countdown !== null && <button className="btn-glass min-h-[40px]" onClick={() => setCountdown(null)}>Cancelar</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionGroup({ label, options, value, onPick, icon }: { label: string; options: { v: string; l: string }[]; value: string; onPick: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-paper">{icon}{label}</legend>
      <ul className="space-y-0.5">
        {options.map((o) => (
          <li key={o.v}>
            <button onClick={() => onPick(o.v)} aria-pressed={value === o.v} className={`flex min-h-[38px] w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition hover:bg-white/10 ${value === o.v ? "text-paper" : "text-paper/65"}`}>
              <span className="grid w-4 place-items-center">{value === o.v && <Check size={15} className="text-lamp" />}</span>
              {o.l}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
