import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { EmptyState } from "@/components/ui";
import { nextEpisode, resolvePlayable, useDocumentTitle } from "@/hooks";
import { useRouter } from "@/lib/router";
import { VideoPlayer, type PlayerPrefs } from "@/player/VideoPlayer";
import { repo } from "@/services";
import { useApp } from "@/store/app";

export default function Watch({ param }: { param: string }) {
  const { navigate, back } = useRouter();
  const { allTitles, sources, catalogStatus, library, libraryReady, saveProgress, profile, saveProfile, canWatch } = useApp();
  const target = useMemo(() => resolvePlayable(allTitles, param), [allTitles, param]);
  useDocumentTitle(target ? `Assistindo ${target.title.title}` : "Player");
  const logged = useRef<string>();

  const source = useMemo(() => {
    if (!target) return undefined;
    const wanted = target.episode?.sourceId ?? target.title.sourceId ?? "demo";
    return sources.find((s) => s.id === wanted) ?? sources.find((s) => s.id === "demo");
  }, [sources, target]);

  const entry = target && library.progress.find((p) => p.titleId === target.title.id && p.episodeId === target.episode?.id);
  // retoma apenas se não terminou (calculado uma vez por item)
  const startAt = useMemo(() => (entry && !entry.finished && entry.position < entry.duration - 3 ? entry.position : 0), [param, libraryReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!target || logged.current === param) return;
    logged.current = param;
    repo.logView({ titleId: target.title.id, profileId: profile.id, at: new Date().toISOString() }).catch(() => undefined);
  }, [target, param, profile.id]);

  const nxt = target?.episode ? nextEpisode(target.title, target.episode.id) : undefined;

  const onProgress = useCallback((position: number, duration: number) => {
    if (!target || !duration || !isFinite(duration)) return;
    saveProgress({
      titleId: target.title.id,
      episodeId: target.episode?.id,
      season: target.season?.number,
      episode: target.episode?.number,
      position,
      duration,
      finished: position / duration > 0.95,
    });
  }, [saveProgress, target]);

  const prefs: PlayerPrefs = { quality: profile.preferences.quality, subtitleLang: profile.preferences.subtitleLang, audioLang: profile.preferences.audioLang };
  const onPrefsChange = (p: PlayerPrefs) => saveProfile({ ...profile, preferences: { ...profile.preferences, ...p } }).catch(() => undefined);

  if (catalogStatus === "loading" || !libraryReady) {
    return <div className="fixed inset-0 z-[80] grid place-items-center bg-black"><span className="h-14 w-14 animate-spin rounded-full border-[3px] border-paper/20 border-t-lamp" /></div>;
  }

  if (target && !canWatch(target.title)) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-ink">
        <EmptyState
          icon={<AlertCircle size={28} />}
          title="Indisponível no perfil infantil"
          body={`${target.title.title} tem classificação ${target.title.rating === "L" ? "livre" : target.title.rating + " anos"}. Troque de perfil para assistir.`}
          action={<button className="btn-primary" onClick={() => navigate("inicio")}>Voltar ao início</button>}
        />
      </div>
    );
  }

  if (!target || !source) {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-ink">
        <EmptyState
          icon={<AlertCircle size={28} />}
          title={target ? "Fonte de vídeo não configurada" : "Título não encontrado"}
          body={target ? "Este título ainda não tem uma fonte de vídeo autorizada. Um administrador pode configurá-la no painel." : "O link pode estar incorreto ou o título foi removido do catálogo."}
          action={<button className="btn-primary" onClick={() => navigate("inicio")}>Voltar ao início</button>}
        />
      </div>
    );
  }

  const { title: t, season, episode } = target;

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <VideoPlayer
        key={param}
        source={source}
        title={t.title}
        subtitle={[episode ? `T${season?.number}:E${episode.number} ${episode.title}` : "", source.kind === "demo" ? "vídeo de demonstração (a obra completa exige fonte licenciada)" : ""].filter(Boolean).join(", ")}
        startAt={startAt}
        prefs={prefs}
        onPrefsChange={onPrefsChange}
        onProgress={onProgress}
        onExit={() => (history.length > 1 ? back() : navigate("titulo", t.id))}
        onEnded={() => { if (!nxt) navigate("titulo", t.id, { replace: true }); }}
        next={nxt ? { label: `T${nxt.season}:E${nxt.number} ${nxt.title}`, autoplay: profile.preferences.autoplayNext, onPlay: () => navigate("assistir", nxt.id, { replace: true }) } : undefined}
      />
    </div>
  );
}
