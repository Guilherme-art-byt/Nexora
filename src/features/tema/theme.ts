export const THEMES = ['dark', 'light', 'system'] as const;
export type Theme = (typeof THEMES)[number];

export const FONT_SIZES = ['small', 'medium', 'large'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const THEME_STORAGE_KEY = 'nexora-theme';
export const FONT_SIZE_STORAGE_KEY = 'nexora-font-size';

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponível (modo privado): a preferência vale só para esta visita.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
  store(THEME_STORAGE_KEY, theme);
}

export function applyFontSize(size: FontSize): void {
  document.documentElement.setAttribute('data-font-size', size);
  store(FONT_SIZE_STORAGE_KEY, size);
}

/**
 * Executado antes da primeira pintura (script inline no <head>) para não piscar o tema
 * errado. Precisa ser autocontido: não pode referenciar nada deste módulo em tempo de execução.
 */
export const themeBootScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})||"dark",f=localStorage.getItem(${JSON.stringify(
  FONT_SIZE_STORAGE_KEY,
)});if(t==="system")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";d.setAttribute("data-theme",t==="light"?"light":"dark");if(f)d.setAttribute("data-font-size",f)}catch(e){}})()`;
