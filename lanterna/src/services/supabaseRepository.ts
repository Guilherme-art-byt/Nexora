import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { uid } from "@/lib/crypto";
import { DEMO_SOURCE } from "@/player/sources";
import { PUBLIC_DOMAIN_SOURCES, isBuiltInSource } from "@/player/publicDomain";
import type { Account, AgeRating, Notification, Profile, ProgressEntry, Rating, Role, Title, VideoSource, ViewEvent } from "@/types";
import { RepoError, type Library, type Repository } from "./repository";

/**
 * Implementação Supabase. Estrutura do banco em supabase/schema.sql.
 * Todas as regras de acesso (usuário x administrador) são aplicadas no banco via RLS;
 * a interface apenas reflete essas permissões.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  readonly sb: SupabaseClient;
  private recovery = false;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    this.sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") this.recovery = true;
    });
  }

  isRecoverySession() { return this.recovery; }

  private fail(error: { message: string } | null, fallback?: string): asserts error is null {
    if (error) throw new RepoError(fallback ?? translate(error.message));
  }

  private async uidOrThrow() {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new RepoError("Sessão expirada. Entre novamente.");
    return data.user.id;
  }

  // ------------------------------------------------------------ catálogo
  async listTitles(): Promise<Title[]> {
    const { data, error } = await this.sb
      .from("titles")
      .select("*, title_genres(genres(name)), title_credits(kind, character, ord, people(name)), seasons(number, year, episodes(*))")
      .order("popularity", { ascending: false });
    this.fail(error);
    return (data ?? []).map(rowToTitle);
  }

  async saveTitle(t: Title) {
    const { error } = await this.sb.rpc("admin_save_title", { payload: titleToPayload(t) });
    this.fail(error);
  }

  async deleteTitle(id: string) {
    const { error } = await this.sb.from("titles").delete().eq("id", id);
    this.fail(error);
  }

  async listSources() {
    const { data, error } = await this.sb.from("video_sources").select("*");
    this.fail(error);
    const rows = (data ?? []).map((r: Row): VideoSource => ({
      id: r.id, name: r.name, kind: r.kind, license: r.license ?? "",
      renditions: r.renditions ?? [], audio: r.audio ?? [], subtitles: r.subtitles ?? [],
    }));
    return [DEMO_SOURCE, ...PUBLIC_DOMAIN_SOURCES, ...rows.filter((s) => !isBuiltInSource(s.id))];
  }

  async saveSource(s: VideoSource) {
    if (s.id === "demo") throw new RepoError("A fonte de demonstração não pode ser alterada.");
    const { error } = await this.sb.from("video_sources").upsert({
      id: s.id, name: s.name, kind: s.kind, license: s.license, renditions: s.renditions, audio: s.audio, subtitles: s.subtitles,
    });
    this.fail(error);
  }

  async deleteSource(id: string) {
    const { error } = await this.sb.from("video_sources").delete().eq("id", id);
    this.fail(error);
  }

  async uploadImage(file: File, folder: "posters" | "backdrops" | "avatars" | "episodes") {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const owner = folder === "avatars" ? `${await this.uidOrThrow()}/` : "";
    const path = `${folder}/${owner}${uid()}.${ext}`;
    const { error } = await this.sb.storage.from("media").upload(path, file, { cacheControl: "31536000", upsert: false });
    this.fail(error, "Não foi possível enviar a imagem. Verifique se o bucket \"media\" existe.");
    return this.sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  // ------------------------------------------------------------ autenticação
  async currentAccount(): Promise<Account | null> {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) return null;
    const { data: row } = await this.sb.from("accounts").select("*").eq("id", data.user.id).maybeSingle();
    if (!row) return null;
    if (row.disabled) {
      await this.sb.auth.signOut();
      return null;
    }
    return rowToAccount(row);
  }

  async signUp(name: string, email: string, password: string) {
    const { data, error } = await this.sb.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: location.origin + location.pathname + "#entrar" },
    });
    this.fail(error);
    if (!data.session) {
      throw new RepoError("Conta criada. Confirme o cadastro pelo link enviado ao seu e-mail e depois entre.");
    }
    const acc = await this.currentAccount();
    if (!acc) throw new RepoError("Conta criada, mas o perfil não foi encontrado. Verifique o gatilho handle_new_user.");
    return acc;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    this.fail(error, "E-mail ou senha incorretos.");
    const acc = await this.currentAccount();
    if (!acc) throw new RepoError("Esta conta foi desativada pela administração.");
    return acc;
  }

  async signOut() { await this.sb.auth.signOut(); }

  async requestPasswordReset(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname + "#recuperar-senha",
    });
    this.fail(error);
    return {};
  }

  /** No Supabase o código vem embutido no link do e-mail; aqui só falta gravar a nova senha. */
  async confirmPasswordReset(_email: string, _code: string, newPassword: string) {
    const { error } = await this.sb.auth.updateUser({ password: newPassword });
    this.fail(error);
    this.recovery = false;
  }

  async updateAccount(patch: Partial<Pick<Account, "name" | "email" | "avatar">>) {
    const id = await this.uidOrThrow();
    if (patch.email) {
      const { error } = await this.sb.auth.updateUser({ email: patch.email });
      this.fail(error);
    }
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.avatar !== undefined) row.avatar_url = patch.avatar;
    if (Object.keys(row).length) {
      const { error } = await this.sb.from("accounts").update(row).eq("id", id);
      this.fail(error);
    }
    return (await this.currentAccount())!;
  }

  async changePassword(current: string, next: string) {
    const { data } = await this.sb.auth.getUser();
    const email = data.user?.email;
    if (!email) throw new RepoError("Sessão expirada. Entre novamente.");
    const check = await this.sb.auth.signInWithPassword({ email, password: current });
    if (check.error) throw new RepoError("A senha atual está incorreta.");
    const { error } = await this.sb.auth.updateUser({ password: next });
    this.fail(error);
  }

  async listAccounts() {
    const { data, error } = await this.sb.from("accounts").select("*").order("created_at");
    this.fail(error);
    return (data ?? []).map(rowToAccount);
  }

  async setRole(accountId: string, role: Role) {
    const { error } = await this.sb.from("accounts").update({ role }).eq("id", accountId);
    this.fail(error);
  }

  async setDisabled(accountId: string, disabled: boolean) {
    if (accountId === (await this.uidOrThrow())) throw new RepoError("Você não pode desativar a própria conta.");
    const { error } = await this.sb.from("accounts").update({ disabled }).eq("id", accountId);
    this.fail(error);
  }

  // ------------------------------------------------------------ perfis
  async listProfiles(accountId: string) {
    const { data, error } = await this.sb.from("viewer_profiles").select("*").eq("account_id", accountId).order("created_at");
    this.fail(error);
    return (data ?? []).map((r: Row): Profile => ({
      id: r.id, accountId: r.account_id, name: r.name, color: r.color, kids: r.kids,
      avatar: r.avatar_url ?? undefined, preferences: r.preferences,
    }));
  }

  async saveProfile(p: Profile) {
    const { error } = await this.sb.from("viewer_profiles").upsert({
      id: p.id, account_id: p.accountId, name: p.name, color: p.color, kids: p.kids,
      avatar_url: p.avatar ?? null, preferences: p.preferences,
    });
    this.fail(error);
  }

  async deleteProfile(id: string) {
    const { error } = await this.sb.from("viewer_profiles").delete().eq("id", id);
    this.fail(error);
  }

  // ------------------------------------------------------------ biblioteca
  async getLibrary(profileId: string): Promise<Library> {
    const [list, hist, rates] = await Promise.all([
      this.sb.from("my_list").select("title_id, added_at").eq("profile_id", profileId).order("added_at", { ascending: false }),
      this.sb.from("watch_history").select("*").eq("profile_id", profileId).order("updated_at", { ascending: false }),
      this.sb.from("ratings").select("title_id, value").eq("profile_id", profileId),
    ]);
    this.fail(list.error ?? hist.error ?? rates.error);
    return {
      myList: (list.data ?? []).map((r: Row) => r.title_id),
      progress: (hist.data ?? []).map((r: Row): ProgressEntry => ({
        titleId: r.title_id, episodeId: r.episode_id ?? undefined, season: r.season ?? undefined, episode: r.episode ?? undefined,
        position: Number(r.position), duration: Number(r.duration), finished: r.finished, updatedAt: r.updated_at,
      })),
      ratings: (rates.data ?? []).map((r: Row): Rating => ({ titleId: r.title_id, value: r.value })),
    };
  }

  async setInList(profileId: string, titleId: string, inList: boolean) {
    const q = inList
      ? this.sb.from("my_list").upsert({ profile_id: profileId, title_id: titleId })
      : this.sb.from("my_list").delete().eq("profile_id", profileId).eq("title_id", titleId);
    const { error } = await q;
    this.fail(error);
  }

  async saveProgress(profileId: string, e: ProgressEntry) {
    const { error } = await this.sb.from("watch_history").upsert({
      profile_id: profileId, title_id: e.titleId, episode_key: e.episodeId ?? "", episode_id: e.episodeId ?? null, season: e.season ?? null,
      episode: e.episode ?? null, position: e.position, duration: e.duration, finished: e.finished, updated_at: e.updatedAt,
    }, { onConflict: "profile_id,title_id,episode_key" });
    this.fail(error);
  }

  async removeProgress(profileId: string, titleId: string) {
    const { error } = await this.sb.from("watch_history").delete().eq("profile_id", profileId).eq("title_id", titleId);
    this.fail(error);
  }

  async setRating(profileId: string, r: Rating | { titleId: string; value: 0 }) {
    const { error } = r.value === 0
      ? await this.sb.from("ratings").delete().eq("profile_id", profileId).eq("title_id", r.titleId)
      : await this.sb.from("ratings").upsert({ profile_id: profileId, title_id: r.titleId, value: r.value });
    this.fail(error);
  }

  // ------------------------------------------------------------ notificações e métricas
  async listNotifications(profileId: string): Promise<Notification[]> {
    const [n, reads] = await Promise.all([
      this.sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
      this.sb.from("notification_reads").select("notification_id").eq("profile_id", profileId),
    ]);
    if (n.error) return [];
    const read = new Set((reads.data ?? []).map((r: Row) => r.notification_id));
    return (n.data ?? []).map((r: Row) => ({
      id: r.id, title: r.title, body: r.body, titleId: r.title_id ?? undefined, createdAt: r.created_at, read: read.has(r.id),
    }));
  }

  async markNotificationsRead(profileId: string, ids: string[]) {
    if (!ids.length) return;
    await this.sb.from("notification_reads").upsert(ids.map((id) => ({ profile_id: profileId, notification_id: id })));
  }

  async logView(ev: ViewEvent) {
    if (ev.profileId === "guest") return; // visitantes não gravam no banco
    await this.sb.from("view_events").insert({ profile_id: ev.profileId, title_id: ev.titleId, at: ev.at });
  }

  async listViews() {
    const { data } = await this.sb.from("view_events").select("profile_id, title_id, at").order("at", { ascending: false }).limit(5000);
    return (data ?? []).map((r: Row) => ({ profileId: r.profile_id, titleId: r.title_id, at: r.at }));
  }
}

// ---------------------------------------------------------------- mapeamentos

function rowToAccount(r: Row): Account {
  return { id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at, avatar: r.avatar_url ?? undefined, disabled: r.disabled };
}

function rowToTitle(r: Row): Title {
  const credits: Row[] = (r.title_credits ?? []).sort((a: Row, b: Row) => a.ord - b.ord);
  return {
    id: r.id, kind: r.kind, title: r.title, originalTitle: r.original_title ?? undefined,
    seasonCount: r.season_count ?? undefined, awards: r.awards ?? undefined, tagline: r.tagline ?? undefined, synopsis: r.synopsis ?? "",
    year: r.year, rating: r.rating as AgeRating, score: Number(r.score), popularity: r.popularity,
    durationMin: r.duration_min ?? undefined, country: r.country ?? "", languages: r.languages ?? [],
    subtitles: r.subtitles ?? [], keywords: r.keywords ?? [], poster: r.poster_url ?? "", backdrop: r.backdrop_url ?? "",
    sourceId: r.source_id ?? undefined, trailerSourceId: r.trailer_source_id ?? undefined, trailerYoutubeKey: r.trailer_youtube_key ?? undefined,
    original: r.original, awarded: r.awarded, addedAt: r.added_at, origin: r.origin, tmdbId: r.tmdb_id ?? undefined,
    genres: (r.title_genres ?? []).map((g: Row) => g.genres?.name).filter(Boolean),
    cast: credits.filter((c) => c.kind === "cast").map((c) => ({ name: c.people?.name, role: c.character ?? undefined })),
    directors: credits.filter((c) => c.kind === "director").map((c) => c.people?.name),
    seasons: r.kind === "series"
      ? (r.seasons ?? [])
          .sort((a: Row, b: Row) => a.number - b.number)
          .map((s: Row) => ({
            number: s.number, year: s.year,
            episodes: (s.episodes ?? [])
              .sort((a: Row, b: Row) => a.number - b.number)
              .map((e: Row) => ({
                id: e.id, number: e.number, title: e.title, synopsis: e.synopsis ?? "", durationMin: e.duration_min,
                thumbnail: e.thumbnail_url ?? undefined, thumbFocus: e.thumb_focus ?? undefined,
              })),
          }))
      : undefined,
  };
}

function titleToPayload(t: Title) {
  return {
    id: t.id, kind: t.kind, title: t.title, original_title: t.originalTitle ?? null, season_count: t.seasonCount ?? null,
    awards: t.awards ?? null, tagline: t.tagline ?? null, synopsis: t.synopsis, year: t.year,
    rating: t.rating, score: t.score, popularity: t.popularity, duration_min: t.durationMin ?? null,
    country: t.country, languages: t.languages, subtitles: t.subtitles, keywords: t.keywords,
    poster_url: t.poster, backdrop_url: t.backdrop, source_id: t.sourceId ?? null, trailer_source_id: t.trailerSourceId ?? null, trailer_youtube_key: t.trailerYoutubeKey ?? null,
    original: !!t.original, awarded: !!t.awarded, origin: t.origin ?? "admin", tmdb_id: t.tmdbId ?? null, added_at: t.addedAt,
    genres: t.genres,
    cast: t.cast.map((c, i) => ({ name: c.name, character: c.role ?? null, ord: i })),
    directors: t.directors,
    seasons: (t.seasons ?? []).map((s) => ({
      number: s.number, year: s.year,
      episodes: s.episodes.map((e) => ({
        id: e.id, number: e.number, title: e.title, synopsis: e.synopsis, duration_min: e.durationMin,
        thumbnail_url: e.thumbnail ?? null, thumb_focus: e.thumbFocus ?? null,
      })),
    })),
  };
}

function translate(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Já existe uma conta com este e-mail.";
  if (m.includes("password should be")) return "A senha não atende aos requisitos mínimos.";
  if (m.includes("row-level security") || m.includes("permission denied")) return "Você não tem permissão para esta ação.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Verifique sua internet.";
  return msg;
}
