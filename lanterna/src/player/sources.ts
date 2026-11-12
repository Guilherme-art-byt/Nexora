import type { VideoSource } from "@/types";
import v720 from "@/assets/media/demo-720p.mp4";
import v360 from "@/assets/media/demo-360p.mp4";
import aOriginal from "@/assets/media/audio-original.m4a";
import aAlt from "@/assets/media/audio-alternativo.m4a";

/**
 * Fontes de vídeo AUTORIZADAS.
 * - "demo": vídeo gerado pelo próprio projeto (artes originais + trilha sintetizada), livre para uso.
 * - Fontes adicionais são cadastradas no painel admin (URL de arquivo próprio ou stream licenciado)
 *   e persistidas pelo repositório (localStorage no modo demo; tabela video_sources no Supabase).
 * Metadados e trailers do TMDB NÃO dão direito de exibir obras completas.
 */

const vtt = (lines: [number, number, string][]) =>
  "WEBVTT\n\n" +
  lines
    .map(([a, b, t], i) => `${i + 1}\n${fmt(a)} --> ${fmt(b)}\n${t}`)
    .join("\n\n");

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3).padStart(6, "0");
  return `00:${String(m).padStart(2, "0")}:${sec}`;
}

export const DEMO_SOURCE: VideoSource = {
  id: "demo",
  name: "Vídeo de demonstração Lanterna",
  kind: "demo",
  license: "Conteúdo original gerado pelo projeto Lanterna — uso livre para demonstração.",
  renditions: [
    { label: "720p", height: 720, src: v720 },
    { label: "360p", height: 360, src: v360 },
  ],
  audio: [
    { id: "orig", label: "Trilha original", lang: "orig", src: aOriginal },
    { id: "alt", label: "Trilha alternativa", lang: "alt", src: aAlt },
  ],
  subtitles: [
    {
      id: "pt", label: "Português", lang: "pt",
      vtt: vtt([
        [1, 5, "[música ambiente]"],
        [5.5, 9, "Este é o vídeo de demonstração da Lanterna."],
        [10, 14, "Ele testa qualidade, áudio, legendas e velocidade."],
        [14.5, 18, "Seu progresso é salvo automaticamente."],
        [19, 23, "Volte depois e continue de onde parou."],
        [23.5, 27, "[a música desaparece]"],
      ]),
    },
    {
      id: "en", label: "English", lang: "en",
      vtt: vtt([
        [1, 5, "[ambient music]"],
        [5.5, 9, "This is the Lanterna demo video."],
        [10, 14, "It tests quality, audio, subtitles and speed."],
        [14.5, 18, "Your progress is saved automatically."],
        [19, 23, "Come back later and pick up where you left off."],
        [23.5, 27, "[music fades out]"],
      ]),
    },
    {
      id: "es", label: "Español", lang: "es",
      vtt: vtt([
        [1, 5, "[música ambiental]"],
        [5.5, 9, "Este es el video de demostración de Lanterna."],
        [10, 14, "Prueba calidad, audio, subtítulos y velocidad."],
        [14.5, 18, "Tu progreso se guarda automáticamente."],
        [19, 23, "Vuelve más tarde y sigue donde lo dejaste."],
        [23.5, 27, "[la música se desvanece]"],
      ]),
    },
  ],
};

export interface Cue { start: number; end: number; text: string }

export function parseVtt(src: string): Cue[] {
  const toSec = (t: string) => {
    const p = t.trim().split(":").map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };
  return src
    .replace(/\r/g, "")
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n");
      const idx = lines.findIndex((l) => l.includes("-->"));
      if (idx < 0) return null;
      const [a, b] = lines[idx].split("-->");
      return { start: toSec(a), end: toSec(b.split(" ").filter(Boolean)[0]), text: lines.slice(idx + 1).join("\n") };
    })
    .filter((c): c is Cue => !!c);
}
