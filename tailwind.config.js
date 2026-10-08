/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          900: 'var(--brand-900)',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          400: 'var(--ink-400)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          soft: 'var(--ok-soft)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      /* Industrial mono = 0 直角。
       * 保留 sm 4px 给 Modal/Fab/checkbox 的极小圆角感。
       * 其他 Tailwind 默认半径（lg/xl/2xl 等）全部强制 0。
       * pill/full 仍可用。 */
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '0',
        md: '4px',
        lg: '4px',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      /* Industrial mono = 不靠阴影造层次，靠 bg shift + hairline。
       * 强制所有阴影 none，仅保留 inner（modal 内部轻微 inset 仍可考虑）。
       * 保留 none 给开发者显式宣告「此元素无阴影」。 */
      boxShadow: {
        none: 'none',
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      },
      transitionTimingFunction: {
        mechanical: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasis: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      fontSize: {
        /* 1.250 比例（dashboard：major third = calm）
         * 14 → 17.5 → 21.875 ≈ 14 / 18 / 22 / 28 / 35 / 43 / 54 */
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
        lg: ['20px', { lineHeight: '1.4' }],
        xl: ['25px', { lineHeight: '1.2' }],
        '2xl': ['31px', { lineHeight: '1.15' }],
        '3xl': ['39px', { lineHeight: '1.05' }],
        '4xl': ['49px', { lineHeight: '1.0' }],
        '5xl': ['62px', { lineHeight: '1.0' }],
      },
      transitionDuration: {
        instant: '80ms',
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
    },
  },
  plugins: [],
};