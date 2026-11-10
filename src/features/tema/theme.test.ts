import { describe, expect, it } from 'vitest';
import { FONT_SIZE_STORAGE_KEY, THEME_STORAGE_KEY, themeBootScript } from './theme';

function runBoot(stored: Record<string, string>, prefersLight: boolean): Record<string, string> {
  const attributes: Record<string, string> = {};
  const run = new Function('document', 'localStorage', 'matchMedia', themeBootScript);
  run(
    {
      documentElement: {
        setAttribute: (name: string, value: string) => (attributes[name] = value),
      },
    },
    { getItem: (key: string) => stored[key] ?? null },
    () => ({ matches: prefersLight }),
  );
  return attributes;
}

describe('themeBootScript', () => {
  it('usa o tema escuro quando não há preferência salva', () => {
    expect(runBoot({}, true)).toEqual({ 'data-theme': 'dark' });
  });

  it('aplica o tema claro e o tamanho de fonte salvos', () => {
    expect(
      runBoot({ [THEME_STORAGE_KEY]: 'light', [FONT_SIZE_STORAGE_KEY]: 'large' }, false),
    ).toEqual({ 'data-theme': 'light', 'data-font-size': 'large' });
  });

  it('segue o sistema quando a preferência é "system"', () => {
    expect(runBoot({ [THEME_STORAGE_KEY]: 'system' }, true)['data-theme']).toBe('light');
    expect(runBoot({ [THEME_STORAGE_KEY]: 'system' }, false)['data-theme']).toBe('dark');
  });

  it('ignora valor desconhecido', () => {
    expect(runBoot({ [THEME_STORAGE_KEY]: 'rosa' }, true)['data-theme']).toBe('dark');
  });
});
