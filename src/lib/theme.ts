import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** The OS appearance setting, re-rendering when it changes. */
export function useSystemTheme(): Theme {
  return useSyncExternalStore(subscribeSystemTheme, systemTheme, () => 'light');
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/** Mirror the OS appearance setting onto <html data-theme>, live. */
export function followSystemTheme() {
  const media = window.matchMedia(DARK_QUERY);
  const sync = () => applyTheme(media.matches ? 'dark' : 'light');
  sync();
  media.addEventListener('change', sync);
  return () => media.removeEventListener('change', sync);
}
