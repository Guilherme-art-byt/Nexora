/** localStorage seguro: nunca quebra a página se o armazenamento estiver indisponível ou cheio. */
const PREFIX = "lanterna:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* indisponível */
  }
}
