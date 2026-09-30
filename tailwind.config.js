/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50)', 100: 'var(--brand-100)',
          500: 'var(--brand-500)', 600: 'var(--brand-600)',
          700: 'var(--brand-700)', 900: 'var(--brand-900)',
        },
        surface: {
          0: 'var(--surface-0)', 1: 'var(--surface-1)',
          2: 'var(--surface-2)', 3: 'var(--surface-3)',
          4: 'var(--surface-4)',
        },
        ink: {
          900: 'var(--ink-900)', 700: 'var(--ink-700)',
          500: 'var(--ink-500)', 400: 'var(--ink-400)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        // sm/md/lg Tailwind defaults are kept; no custom values per spec
      },
      borderRadius: {
        // rounded / md / lg / xl only per spec
      },
    },
  },
  plugins: [],
};
