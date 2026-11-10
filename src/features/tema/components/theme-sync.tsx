'use client';

import { useEffect } from 'react';
import { useSettings } from '@/features/configuracoes/hooks';
import { applyFontSize, applyTheme, FONT_SIZES, THEMES, type FontSize, type Theme } from '../theme';

function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

function isFontSize(value: string): value is FontSize {
  return (FONT_SIZES as readonly string[]).includes(value);
}

/** Aplica o tema e o tamanho de fonte salvos na conta e acompanha o tema do sistema. */
export function ThemeSync() {
  const { data: settings } = useSettings();
  const theme = settings && isTheme(settings.theme) ? settings.theme : null;
  const fontSize = settings && isFontSize(settings.font_size) ? settings.font_size : null;

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    if (fontSize) applyFontSize(fontSize);
  }, [fontSize]);

  return null;
}
