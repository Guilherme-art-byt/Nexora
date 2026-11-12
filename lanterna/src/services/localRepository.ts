import { DEMO_TITLES } from "@/data/catalog";
import { DEMO_SOURCE } from "@/player/sources";
import { PUBLIC_DOMAIN_SOURCES } from "@/player/publicDomain";
import { hashPassword, randomSalt, uid, verifyPassword } from "@/lib/crypto";
import { load, remove, save } from "@/lib/storage";
import type { Account, Notification, Profile, ProgressEntry, Rating, Role, StoredAccount, Title, VideoSource, ViewEvent } from "@/types";
import { emptyLibrary, RepoError, type Library, type Repository } from "./repository";

/** Conta administradora criada na primeira execução do modo demonstração. */
export const DEMO_ADMIN = { email: "admin@lanterna.app", password: "Lanterna@2026", name: "Administração" };

const K = {
  accounts: "accounts",
  session: "session",
  titlesOverride: "catalog:overrides", // títulos criados/editados pelo admin
  titlesDeleted: "catalog:deleted",
  sources: "sources",
  profiles: "profiles",
  lib: (p: string) => `library:${p}`,
  notifRead: (p: string) => `notif-read:${p}`,
  views: "views",
  resets: "reset-codes",
};

const strip = ({ passwordHash: _h, salt: _s, ...a }: StoredAccount): Account => a;
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class LocalRepository implements Repository {
  readonly mode = "demo" as const;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.seed();
  }

  private async seed() {
    const accounts = load<StoredAccount[]>(K.accounts, []);
    if (!accounts.some((a) => a.email === DEMO_ADMIN.email)) {
      const salt = randomSalt();
      accounts.push({
        id: "acc-admin", name: DEMO_ADMIN.name, email: DEMO_ADMIN.email, role: "admin",
        createdAt: new Date().toISOString(), salt, passwordHash: await hashPassword(DEMO_ADMIN.password, salt),
      });
      save(K.accounts, accounts);
    }
  }

  private accounts() { return load<StoredAccount[]>(K.accounts, []); }
  private session() { return load<{ accountId: string } | null>(K.session, null); }

  // ------------------------------------------------------------ catálogo
  async listTitles() {
    await delay(260); // simula a latência da rede para exibir os skeletons
    const overrides = load<Title[]>(K.titlesOverride, []);
    const deleted = new Set(load<string[]>(K.titlesDeleted, []));
    const map = new Map<string, Title>();
    for (const t of DEMO_TITLES) map.set(t.id, t);
    for (const t of overrides) map.set(t.id, t);
    return [...map.values()].filter((t) => !deleted.has(t.id));
  }

  async saveTitle(t: Title) {
    const list = load<Title[]>(K.titlesOverride, []).filter((x) => x.id !== t.id);
    list.push(t);
    if (!save(K.titlesOverride, list)) throw new RepoError("Armazenamento do navegador cheio. Use imagens menores ou configure o Supabase.");
    save(K.titlesDeleted, load<string[]>(K.titlesDeleted, []).filter((id) => id !== t.id));
  }

  async deleteTitle(id: string) {
    save(K.titlesOverride, load<Title[]>(K.titlesOverride, []).filter((x) => x.id !== id));
    save(K.titlesDeleted, [...new Set([...load<string[]>(K.titlesDeleted, []), id])]);
  }

  async listSources() {
    return [DEMO_SOURCE, ...PUBLIC_DOMAIN_SOURCES, ...load<VideoSource[]>(K.sources, [])];
  }

  async saveSource(s: VideoSource) {
    if (s.id === "demo") throw new RepoError("A fonte de demonstração não pode ser alterada.");
    save(K.sources, [...load<VideoSource[]>(K.sources, []).filter((x) => x.id !== s.id), s]);
  }

  async deleteSource(id: string) {
    save(K.sources, load<VideoSource[]>(K.sources, []).filter((x) => x.id !== id));
  }

  /** No modo demo a imagem é reduzida e guardada como data URL (cabe no armazenamento local). */
  async uploadImage(file: File, folder: "posters" | "backdrops" | "avatars" | "episodes") {
    const max = folder === "backdrops" ? 1280 : folder === "avatars" ? 256 : 520;
    return compressImage(file, max);
  }

  // ------------------------------------------------------------ autenticação
  async currentAccount() {
    await this.ready;
    const s = this.session();
    if (!s) return null;
    const acc = this.accounts().find((a) => a.id === s.accountId);
    if (!acc || acc.disabled) return null;
    return strip(acc);
  }

  async signUp(name: string, email: string, password: string) {
    await this.ready;
    const e = email.trim().toLowerCase();
    const accounts = this.accounts();
    if (accounts.some((a) => a.email === e)) throw new RepoError("Já existe uma conta com este e-mail.");
    const salt = randomSalt();
    const acc: StoredAccount = {
      id: uid("acc-"), name: name.trim(), email: e, role: "user", createdAt: new Date().toISOString(),
      salt, passwordHash: await hashPassword(password, salt),
    };
    save(K.accounts, [...accounts, acc]);
    save(K.session, { accountId: acc.id });
    return strip(acc);
  }

  async signIn(email: string, password: string) {
    await this.ready;
    const acc = this.accounts().find((a) => a.email === email.trim().toLowerCase());
    if (!acc || !(await verifyPassword(password, acc.salt, acc.passwordHash))) {
      throw new RepoError("E-mail ou senha incorretos.");
    }
    if (acc.disabled) throw new RepoError("Esta conta foi desativada pela administração.");
    save(K.session, { accountId: acc.id });
    return strip(acc);
  }

  async signOut() { remove(K.session); }

  async requestPasswordReset(email: string) {
    await delay(400);
    const acc = this.accounts().find((a) => a.email === email.trim().toLowerCase());
    // Por segurança a resposta é a mesma exista ou não a conta. No modo demo não há envio de e-mail,
    // então o código é devolvido para ser exibido na tela.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (acc) {
      const codes = load<Record<string, { code: string; exp: number }>>(K.resets, {});
      codes[acc.email] = { code, exp: Date.now() + 15 * 60_000 };
      save(K.resets, codes);
    }
    return { demoCode: code };
  }

  async confirmPasswordReset(email: string, code: string, newPassword: string) {
    const e = email.trim().toLowerCase();
    const codes = load<Record<string, { code: string; exp: number }>>(K.resets, {});
    const entry = codes[e];
    if (!entry || entry.code !== code.trim() || entry.exp < Date.now()) throw new RepoError("Código inválido ou expirado.");
    const accounts = this.accounts();
    const acc = accounts.find((a) => a.email === e);
    if (!acc) throw new RepoError("Código inválido ou expirado.");
    acc.salt = randomSalt();
    acc.passwordHash = await hashPassword(newPassword, acc.salt);
    save(K.accounts, accounts);
    delete codes[e];
    save(K.resets, codes);
  }

  async updateAccount(patch: Partial<Pick<Account, "name" | "email" | "avatar">>) {
    const s = this.session();
    const accounts = this.accounts();
    const acc = accounts.find((a) => a.id === s?.accountId);
    if (!acc) throw new RepoError("Sessão expirada. Entre novamente.");
    if (patch.email) {
      const e = patch.email.trim().toLowerCase();
      if (accounts.some((a) => a.email === e && a.id !== acc.id)) throw new RepoError("Este e-mail já está em uso.");
      acc.email = e;
    }
    if (patch.name !== undefined) acc.name = patch.name.trim();
    if (patch.avatar !== undefined) acc.avatar = patch.avatar;
    if (!save(K.accounts, accounts)) throw new RepoError("Armazenamento do navegador cheio.");
    return strip(acc);
  }

  async changePassword(current: string, next: string) {
    const s = this.session();
    const accounts = this.accounts();
    const acc = accounts.find((a) => a.id === s?.accountId);
    if (!acc) throw new RepoError("Sessão expirada. Entre novamente.");
    if (!(await verifyPassword(current, acc.salt, acc.passwordHash))) throw new RepoError("A senha atual está incorreta.");
    acc.salt = randomSalt();
    acc.passwordHash = await hashPassword(next, acc.salt);
    save(K.accounts, accounts);
  }

  async listAccounts() { await this.ready; return this.accounts().map(strip); }

  async setRole(accountId: string, role: Role) {
    const accounts = this.accounts();
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    if (acc.role === "admin" && role !== "admin" && accounts.filter((a) => a.role === "admin").length === 1) {
      throw new RepoError("A plataforma precisa de pelo menos uma conta administradora.");
    }
    acc.role = role;
    save(K.accounts, accounts);
  }

  async setDisabled(accountId: string, disabled: boolean) {
    const accounts = this.accounts();
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    if (acc.id === this.session()?.accountId) throw new RepoError("Você não pode desativar a própria conta.");
    acc.disabled = disabled;
    save(K.accounts, accounts);
  }

  // ------------------------------------------------------------ perfis
  async listProfiles(accountId: string) {
    return load<Profile[]>(K.profiles, []).filter((p) => p.accountId === accountId);
  }

  async saveProfile(p: Profile) {
    const list = load<Profile[]>(K.profiles, []).filter((x) => x.id !== p.id);
    if (!save(K.profiles, [...list, p])) throw new RepoError("Armazenamento do navegador cheio.");
  }

  async deleteProfile(id: string) {
    save(K.profiles, load<Profile[]>(K.profiles, []).filter((x) => x.id !== id));
    remove(K.lib(id));
  }

  // ------------------------------------------------------------ biblioteca
  async getLibrary(profileId: string): Promise<Library> {
    return { ...emptyLibrary(), ...load<Library>(K.lib(profileId), emptyLibrary()) };
  }

  private async mutate(profileId: string, fn: (l: Library) => void) {
    const lib = await this.getLibrary(profileId);
    fn(lib);
    save(K.lib(profileId), lib);
  }

  setInList(profileId: string, titleId: string, inList: boolean) {
    return this.mutate(profileId, (l) => {
      l.myList = l.myList.filter((id) => id !== titleId);
      if (inList) l.myList.unshift(titleId);
    });
  }

  saveProgress(profileId: string, entry: ProgressEntry) {
    return this.mutate(profileId, (l) => {
      // uma entrada por título + episódio; a mais recente fica no topo
      l.progress = [entry, ...l.progress.filter((p) => !(p.titleId === entry.titleId && p.episodeId === entry.episodeId))].slice(0, 400);
    });
  }

  removeProgress(profileId: string, titleId: string) {
    return this.mutate(profileId, (l) => { l.progress = l.progress.filter((p) => p.titleId !== titleId); });
  }

  setRating(profileId: string, rating: Rating | { titleId: string; value: 0 }) {
    return this.mutate(profileId, (l) => {
      l.ratings = l.ratings.filter((r) => r.titleId !== rating.titleId);
      if (rating.value !== 0) l.ratings.push(rating as Rating);
    });
  }

  // ------------------------------------------------------------ notificações e métricas
  async listNotifications(profileId: string, titles: Title[]): Promise<Notification[]> {
    const read = new Set(load<string[]>(K.notifRead(profileId), []));
    const cutoff = Date.now() - 21 * 86400_000;
    return titles
      .filter((t) => new Date(t.addedAt).getTime() >= cutoff)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 8)
      .map((t) => ({
        id: `new-${t.id}`,
        title: t.kind === "series" ? "Nova série no catálogo" : "Novo filme no catálogo",
        body: `${t.title} já está disponível.`,
        titleId: t.id,
        createdAt: t.addedAt,
        read: read.has(`new-${t.id}`),
      }));
  }

  async markNotificationsRead(profileId: string, ids: string[]) {
    save(K.notifRead(profileId), [...new Set([...load<string[]>(K.notifRead(profileId), []), ...ids])]);
  }

  async logView(ev: ViewEvent) {
    const views = load<ViewEvent[]>(K.views, []);
    views.push(ev);
    save(K.views, views.slice(-2000));
  }

  async listViews() { return load<ViewEvent[]>(K.views, []); }
}

export function compressImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new RepoError("Envie um arquivo de imagem (JPG, PNG ou WebP)."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new RepoError("Não foi possível ler esta imagem.")); };
    img.src = url;
  });
}
