/**
 * Hash de senha para o MODO DEMONSTRAÇÃO (contas locais): PBKDF2-SHA256, 120 mil iterações, salt aleatório.
 * Senhas nunca são armazenadas em texto puro. Com Supabase, o hash é feito pelo Supabase Auth.
 */
const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export function randomSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password, salt);
  if (h.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export function uid(prefix = ""): string {
  return prefix + toHex(crypto.getRandomValues(new Uint8Array(8)).buffer);
}
