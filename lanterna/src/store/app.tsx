import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KIDS_MAX_RATING } from "@/data/catalog";
import { uid } from "@/lib/crypto";
import { load, save } from "@/lib/storage";
import { repo, tmdbTransport } from "@/services";
import { withOfficialArt } from "@/services/tmdb";
import { emptyLibrary, type Library } from "@/services/repository";
import type { Account, Notification, Profile, ProfilePreferences, ProgressEntry, Title, VideoSource } from "@/types";
import { useUI } from "./ui";

export const PROFILE_COLORS = ["#F0A83A", "#5B8DEF", "#E0607E", "#3FB68B", "#9B7BF0", "#E57B3C"];

export const defaultPrefs = (): ProfilePreferences => ({
  autoplayNext: true, subtitleLang: "off", audioLang: "orig", quality: "auto", favoriteGenres: [], reduceMotion: false,
});

const GUEST_BASE: Profile = { id: "guest", accountId: "guest", name: "Visitante", color: "#8A8D99", kids: false, preferences: defaultPrefs() };

interface AppCtx {
  // catálogo
  titles: Title[]; // filtrado pelo perfil (infantil)
  allTitles: Title[];
  sources: VideoSource[];
  catalogStatus: "loading" | "ready" | "error";
  reloadCatalog: () => Promise<void>;
  getTitle: (id: string) => Title | undefined;
  // sessão
  account: Account | null;
  authReady: boolean;
  profiles: Profile[];
  profile: Profile;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  selectProfile: (id: string) => void;
  saveProfile: (p: Profile) => Promise<void>;
  createProfile: (name: string, kids: boolean) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  // biblioteca
  library: Library;
  libraryReady: boolean;
  clearList: () => Promise<void>;
  clearHistory: () => Promise<void>;
  canWatch: (t: Title) => boolean;
  inList: (titleId: string) => boolean;
  toggleList: (titleId: string) => Promise<void>;
  saveProgress: (entry: Omit<ProgressEntry, "updatedAt">) => void;
  removeProgress: (titleId: string) => Promise<void>;
  rate: (titleId: string, value: 1 | -1) => Promise<void>;
  // busca
  searchHistory: string[];
  pushSearch: (q: string) => void;
  clearSearchHistory: () => void;
  // notificações
  notifications: Notification[];
  markAllRead: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useUI();
  const [allTitles, setAllTitles] = useState<Title[]>([]);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<AppCtx["catalogStatus"]>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState("guest");
  const [library, setLibrary] = useState<Library>(emptyLibrary());
  const [libraryReady, setLibraryReady] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [guest, setGuest] = useState<Profile>(() => {
    const g = load<Profile | null>("guest-profile", null);
    return g ? { ...GUEST_BASE, preferences: { ...defaultPrefs(), ...g.preferences } } : GUEST_BASE;
  });
  const lastProgressSave = useRef<Record<string, number>>({});

  const profile = useMemo(() => profiles.find((p) => p.id === profileId) ?? guest, [profiles, profileId, guest]);

  // ----------------------------------------------------------- catálogo
  const reloadCatalog = useCallback(async () => {
    setCatalogStatus((s) => (s === "ready" ? s : "loading"));
    try {
      const [t, s] = await Promise.all([repo.listTitles(), repo.listSources()]);
      setAllTitles(t);
      setSources(s);
      setCatalogStatus("ready");
      // com o proxy do TMDB ativo, troca as artes ilustrativas pelas oficiais em segundo plano
      if (tmdbTransport === "proxy") withOfficialArt(t).then(setAllTitles).catch(() => undefined);
    } catch {
      setCatalogStatus("error");
    }
  }, []);

  useEffect(() => { reloadCatalog(); }, [reloadCatalog]);

  const titles = useMemo(
    () => (profile.kids ? allTitles.filter((t) => KIDS_MAX_RATING.includes(t.rating)) : allTitles),
    [allTitles, profile.kids],
  );
  const titleMap = useMemo(() => new Map(allTitles.map((t) => [t.id, t])), [allTitles]);
  const getTitle = useCallback((id: string) => titleMap.get(id), [titleMap]);

  // ----------------------------------------------------------- conta e perfis
  const loadProfiles = useCallback(async (acc: Account | null) => {
    if (!acc) {
      setProfiles([]);
      setProfileId("guest");
      return;
    }
    let list = await repo.listProfiles(acc.id);
    if (!list.length) {
      const first: Profile = { id: uid("pf-"), accountId: acc.id, name: acc.name.split(" ")[0] || "Perfil", color: PROFILE_COLORS[0], kids: false, preferences: defaultPrefs() };
      await repo.saveProfile(first);
      list = [first];
    }
    setProfiles(list);
    const stored = load<string | null>(`active-profile:${acc.id}`, null);
    setProfileId(list.find((p) => p.id === stored)?.id ?? list[0].id);
  }, []);

  const refreshAccount = useCallback(async () => {
    const acc = await repo.currentAccount().catch(() => null);
    setAccount(acc);
    return loadProfiles(acc);
  }, [loadProfiles]);

  useEffect(() => {
    refreshAccount().finally(() => setAuthReady(true));
  }, [refreshAccount]);

  const signIn = useCallback(async (email: string, password: string) => {
    const acc = await repo.signIn(email, password);
    setAccount(acc);
    await loadProfiles(acc);
  }, [loadProfiles]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const acc = await repo.signUp(name, email, password);
    setAccount(acc);
    await loadProfiles(acc);
  }, [loadProfiles]);

  const signOut = useCallback(async () => {
    await repo.signOut();
    setAccount(null);
    await loadProfiles(null);
  }, [loadProfiles]);

  const selectProfile = useCallback((id: string) => {
    setProfileId(id);
    if (account) save(`active-profile:${account.id}`, id);
  }, [account]);

  const saveProfile = useCallback(async (p: Profile) => {
    if (p.id === "guest") {
      // o visitante guarda só as preferências, neste aparelho
      setGuest({ ...GUEST_BASE, preferences: p.preferences });
      save("guest-profile", { preferences: p.preferences });
      return;
    }
    await repo.saveProfile(p);
    setProfiles((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
  }, []);

  const createProfile = useCallback(async (name: string, kids: boolean) => {
    if (!account) throw new Error("Entre na sua conta para criar perfis.");
    const p: Profile = {
      id: uid("pf-"), accountId: account.id, name, kids,
      color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length], preferences: defaultPrefs(),
    };
    await saveProfile(p);
    return p;
  }, [account, profiles.length, saveProfile]);

  const deleteProfile = useCallback(async (id: string) => {
    await repo.deleteProfile(id);
    setProfiles((list) => {
      const next = list.filter((p) => p.id !== id);
      if (profileId === id && next[0]) setProfileId(next[0].id);
      return next;
    });
  }, [profileId]);

  // ----------------------------------------------------------- biblioteca do perfil ativo
  useEffect(() => {
    let alive = true;
    setLibraryReady(false);
    repo.getLibrary(profile.id)
      .then((l) => alive && setLibrary(l))
      .catch(() => alive && setLibrary(emptyLibrary()))
      .finally(() => alive && setLibraryReady(true));
    setSearchHistory(load<string[]>(`search:${profile.id}`, []));
    return () => { alive = false; };
  }, [profile.id]);

  useEffect(() => {
    if (catalogStatus !== "ready") return;
    repo.listNotifications(profile.id, allTitles).then(setNotifications).catch(() => setNotifications([]));
  }, [profile.id, allTitles, catalogStatus]);

  const listSet = useMemo(() => new Set(library.myList), [library.myList]);
  const inList = useCallback((id: string) => listSet.has(id), [listSet]);

  const toggleList = useCallback(async (titleId: string) => {
    const adding = !listSet.has(titleId);
    const name = titleMap.get(titleId)?.title ?? "Título";
    setLibrary((l) => ({ ...l, myList: adding ? [titleId, ...l.myList] : l.myList.filter((x) => x !== titleId) }));
    try {
      await repo.setInList(profile.id, titleId, adding);
      toast(adding ? `${name} foi adicionado à Minha Lista` : `${name} foi removido da Minha Lista`, "success", adding ? undefined : {
        label: "Desfazer",
        run: () => {
          setLibrary((l) => ({ ...l, myList: [titleId, ...l.myList.filter((x) => x !== titleId)] }));
          repo.setInList(profile.id, titleId, true);
        },
      });
    } catch (e) {
      setLibrary((l) => ({ ...l, myList: adding ? l.myList.filter((x) => x !== titleId) : [titleId, ...l.myList] }));
      toast((e as Error).message || "Não foi possível atualizar a Minha Lista.", "error");
    }
  }, [listSet, profile.id, titleMap, toast]);

  const saveProgress = useCallback((e: Omit<ProgressEntry, "updatedAt">) => {
    const entry: ProgressEntry = { ...e, updatedAt: new Date().toISOString() };
    setLibrary((l) => ({ ...l, progress: [entry, ...l.progress.filter((p) => !(p.titleId === e.titleId && p.episodeId === e.episodeId))] }));
    // grava no repositório no máximo a cada 4 s por título (e sempre ao terminar)
    const now = Date.now();
    const key = `${e.titleId}:${e.episodeId ?? ""}`;
    if (e.finished || now - (lastProgressSave.current[key] ?? 0) > 4000) {
      lastProgressSave.current[key] = now;
      repo.saveProgress(profile.id, entry).catch(() => undefined);
    }
  }, [profile.id]);

  const removeProgress = useCallback(async (titleId: string) => {
    setLibrary((l) => ({ ...l, progress: l.progress.filter((p) => p.titleId !== titleId) }));
    await repo.removeProgress(profile.id, titleId);
    toast("Removido de Continuar assistindo");
  }, [profile.id, toast]);

  const clearList = useCallback(async () => {
    const ids = [...library.myList];
    setLibrary((l) => ({ ...l, myList: [] }));
    await Promise.all(ids.map((id) => repo.setInList(profile.id, id, false)));
    toast(ids.length === 1 ? "1 título removido da Minha Lista" : `${ids.length} títulos removidos da Minha Lista`);
  }, [library.myList, profile.id, toast]);

  const clearHistory = useCallback(async () => {
    const ids = [...new Set(library.progress.map((p) => p.titleId))];
    setLibrary((l) => ({ ...l, progress: [] }));
    await Promise.all(ids.map((id) => repo.removeProgress(profile.id, id)));
    toast("Histórico de reprodução apagado");
  }, [library.progress, profile.id, toast]);

  const canWatch = useCallback((t: Title) => !profile.kids || KIDS_MAX_RATING.includes(t.rating), [profile.kids]);

  const rate = useCallback(async (titleId: string, value: 1 | -1) => {
    const current = library.ratings.find((r) => r.titleId === titleId)?.value;
    const next = current === value ? 0 : value;
    setLibrary((l) => ({ ...l, ratings: [...l.ratings.filter((r) => r.titleId !== titleId), ...(next ? [{ titleId, value: next as 1 | -1 }] : [])] }));
    await repo.setRating(profile.id, { titleId, value: next as 1 | -1 | 0 } as never);
    if (next) toast(next === 1 ? "Avaliação salva: gostei. Suas recomendações foram atualizadas." : "Avaliação salva: não é pra mim. Vamos mostrar menos títulos assim.");
  }, [library.ratings, profile.id, toast]);

  // ----------------------------------------------------------- histórico de busca
  const pushSearch = useCallback((q: string) => {
    const v = q.trim();
    if (v.length < 2) return;
    setSearchHistory((h) => {
      const next = [v, ...h.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 10);
      save(`search:${profile.id}`, next);
      return next;
    });
  }, [profile.id]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    save(`search:${profile.id}`, []);
  }, [profile.id]);

  const markAllRead = useCallback(() => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    repo.markNotificationsRead(profile.id, ids);
  }, [notifications, profile.id]);

  const value: AppCtx = {
    titles, allTitles, sources, catalogStatus, reloadCatalog, getTitle,
    account, authReady, profiles, profile, isGuest: !account,
    signIn, signUp, signOut, refreshAccount, selectProfile, saveProfile, createProfile, deleteProfile,
    library, libraryReady, clearList, clearHistory, canWatch, inList, toggleList, saveProgress, removeProgress, rate,
    searchHistory, pushSearch, clearSearchHistory,
    notifications, markAllRead,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}
