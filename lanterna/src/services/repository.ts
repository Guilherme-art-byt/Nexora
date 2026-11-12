import type { Account, Notification, Profile, ProgressEntry, Rating, Role, Title, VideoSource, ViewEvent } from "@/types";

export interface Library {
  myList: string[];
  progress: ProgressEntry[];
  ratings: Rating[];
}

export const emptyLibrary = (): Library => ({ myList: [], progress: [], ratings: [] });

/**
 * Contrato único de dados. Duas implementações:
 *  - LocalRepository: modo demonstração, persistido no navegador.
 *  - SupabaseRepository: Postgres + Auth + Storage (ativado com VITE_SUPABASE_URL/ANON_KEY).
 */
export interface Repository {
  readonly mode: "demo" | "supabase";

  // catálogo
  listTitles(): Promise<Title[]>;
  saveTitle(t: Title): Promise<void>;
  deleteTitle(id: string): Promise<void>;
  listSources(): Promise<VideoSource[]>;
  saveSource(s: VideoSource): Promise<void>;
  deleteSource(id: string): Promise<void>;
  uploadImage(file: File, folder: "posters" | "backdrops" | "avatars" | "episodes"): Promise<string>;

  // autenticação
  currentAccount(): Promise<Account | null>;
  signUp(name: string, email: string, password: string): Promise<Account>;
  signIn(email: string, password: string): Promise<Account>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<{ demoCode?: string }>;
  confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void>;
  /** Supabase: true quando o usuário chegou pelo link de recuperação do e-mail. */
  isRecoverySession?(): boolean;
  updateAccount(patch: Partial<Pick<Account, "name" | "email" | "avatar">>): Promise<Account>;
  changePassword(current: string, next: string): Promise<void>;

  // administração de usuários
  listAccounts(): Promise<Account[]>;
  setRole(accountId: string, role: Role): Promise<void>;
  setDisabled(accountId: string, disabled: boolean): Promise<void>;

  // perfis
  listProfiles(accountId: string): Promise<Profile[]>;
  saveProfile(p: Profile): Promise<void>;
  deleteProfile(id: string): Promise<void>;

  // biblioteca do perfil
  getLibrary(profileId: string): Promise<Library>;
  setInList(profileId: string, titleId: string, inList: boolean): Promise<void>;
  saveProgress(profileId: string, entry: ProgressEntry): Promise<void>;
  removeProgress(profileId: string, titleId: string): Promise<void>;
  setRating(profileId: string, rating: Rating | { titleId: string; value: 0 }): Promise<void>;

  // notificações e métricas
  listNotifications(profileId: string, titles: Title[]): Promise<Notification[]>;
  markNotificationsRead(profileId: string, ids: string[]): Promise<void>;
  logView(ev: ViewEvent): Promise<void>;
  listViews(): Promise<ViewEvent[]>;
}

export class RepoError extends Error {}
