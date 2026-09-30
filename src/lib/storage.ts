import type { ThemeName, ColorScheme } from './types';

export const storage = {
  get theme(): ThemeName {
    return (localStorage.getItem('theme') as ThemeName) || 'indigo';
  },
  set theme(v: ThemeName) {
    localStorage.setItem('theme', v);
  },
  get colorScheme(): ColorScheme {
    return (localStorage.getItem('colorScheme') as ColorScheme) || 'light';
  },
  set colorScheme(v: ColorScheme) {
    localStorage.setItem('colorScheme', v);
  },
};

/** Repaint the favicon in the current brand colour so the tab icon tracks the theme. */
export function applyFavicon() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim() || '#4f46e5';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = href;
}

export function applyTheme(t: ThemeName) {
  document.documentElement.setAttribute('data-theme', t);
  storage.theme = t;
  applyFavicon();
}
export function applyColorScheme(c: ColorScheme) {
  document.documentElement.classList.toggle('dark', c === 'dark');
  storage.colorScheme = c;
}
export function initTheme() {
  applyTheme(storage.theme);
  applyColorScheme(storage.colorScheme);
}
