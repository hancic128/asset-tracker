import type { ThemeName, ColorScheme } from './types';

/**
 * 唯一持久化外观偏好。
 * ThemeName 保留类型但只取 'indigo'（DESIGN.md §This design will NOT use）。
 */
export const storage = {
  get theme(): ThemeName {
    return 'indigo';
  },
  /** 兼容旧调用方；忽略写入（不提供切换）。 */
  set theme(_v: ThemeName) {
    /* noop —— 5 主题已砍掉 */
  },
  get colorScheme(): ColorScheme {
    const v = localStorage.getItem('colorScheme');
    return v === 'dark' || v === 'system' || v === 'light' ? v : 'system';
  },
  set colorScheme(v: ColorScheme) {
    localStorage.setItem('colorScheme', v);
  },
};

/** Repaint the favicon in the current brand colour so the tab icon tracks the theme. */
export function applyFavicon() {
  const color =
    getComputedStyle(document.documentElement).getPropertyValue('--brand-600').trim() || '#4338ca';
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

/**
 * 应用 brand 主题：当前只有一个 indigo，但保留接口供未来扩展。
 * 内部重画 favicon 以跟 token 颜色走。
 */
export function applyTheme(_t: ThemeName) {
  document.documentElement.setAttribute('data-theme', 'indigo');
  applyFavicon();
}

/**
 * 应用外观（light/dark/system）。
 * system 模式下由浏览器 prefers-color-scheme 媒体查询驱动 .dark 类的应用；
 * 我们只设 data-scheme 标签供 CSS 选择器使用，dark 类自身在 system 模式下
 * 跟随媒体查询。
 */
export function applyColorScheme(c: ColorScheme) {
  const root = document.documentElement;
  root.setAttribute('data-scheme', c);
  if (c === 'dark') {
    root.classList.add('dark');
  } else if (c === 'light') {
    root.classList.remove('dark');
  } else {
    // system：让 @media (prefers-color-scheme: dark) 自动决定
    root.classList.toggle('dark', matchMedia('(prefers-color-scheme: dark)').matches);
  }
  storage.colorScheme = c;
}

let mmListener: ((e: MediaQueryListEvent) => void) | null = null;

/** 启动外观：固定 indigo 主题 + 应用保存的 scheme；system 模式监听系统变化。 */
export function initTheme() {
  applyTheme('indigo');
  applyColorScheme(storage.colorScheme);
  if (mmListener) {
    matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mmListener);
  }
  mmListener = () => {
    if (storage.colorScheme === 'system') applyColorScheme('system');
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', mmListener);
}