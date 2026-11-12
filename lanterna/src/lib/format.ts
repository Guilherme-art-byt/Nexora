import type { Title } from "@/types";

export function formatDuration(min?: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m.toString().padStart(2, "0")}min` : `${m}min`;
}

export function formatClock(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function titleLength(t: Title) {
  if (t.kind === "movie") return formatDuration(t.durationMin);
  const n = t.seasonCount ?? t.seasons?.length ?? 0;
  return n === 1 ? "1 temporada" : `${n} temporadas`;
}

export function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function slugify(s: string) {
  return normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

/** Tamanho do título de destaque proporcional ao comprimento, para nomes longos não estourarem o layout. */
export function displayTitleSize(title: string, where: "hero" | "details") {
  const n = title.length;
  if (where === "hero") {
    if (n <= 12) return "text-[clamp(3.2rem,11vw,7.5rem)]";
    if (n <= 22) return "text-[clamp(2.6rem,7.5vw,5.25rem)]";
    return "text-[clamp(2.1rem,5.5vw,4rem)]";
  }
  if (n <= 12) return "text-[clamp(3rem,8vw,6rem)]";
  if (n <= 22) return "text-[clamp(2.5rem,6.5vw,4.5rem)]";
  return "text-[clamp(2rem,4.8vw,3.4rem)]";
}
