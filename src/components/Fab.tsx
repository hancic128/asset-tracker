import { useState } from 'react';
import { Sun, Moon, Palette, Settings2, SlidersHorizontal, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ThemeName, ColorScheme } from '@/lib/types';
import { applyTheme, applyColorScheme } from '@/lib/storage';

interface Props {
  theme: ThemeName;
  scheme: ColorScheme;
  onChange: () => void;
  onOpenSettings: () => void;
}

// Static class strings — Tailwind cannot see dynamically interpolated names.
const THEMES: { name: ThemeName; color: string; ring: string; label: string }[] = [
  { name: 'indigo', color: 'bg-indigo-600', ring: 'ring-indigo-600', label: 'Indigo' },
  { name: 'emerald', color: 'bg-emerald-600', ring: 'ring-emerald-600', label: 'Emerald' },
  { name: 'rose', color: 'bg-rose-600', ring: 'ring-rose-600', label: 'Rose' },
  { name: 'amber', color: 'bg-amber-600', ring: 'ring-amber-600', label: 'Amber' },
  { name: 'slate', color: 'bg-slate-600', ring: 'ring-slate-600', label: 'Slate' },
];

export default function Fab({ theme, scheme, onChange, onOpenSettings }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setPaletteOpen(false);
  };

  const itemCls = 'w-10 h-10 rounded-full shadow-md border flex items-center justify-center transition-colors shrink-0';
  const idleCls = 'bg-surface-0 border-surface-3 text-ink-700 hover:bg-surface-2 ';
  const activeCls = 'bg-brand-600 border-brand-600 text-white';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2">
          {paletteOpen && (
            <div className="bg-surface-0 rounded-full shadow-md border border-surface-3 px-3 py-2 flex items-center gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.name}
                  aria-label={th.label}
                  title={th.label}
                  onClick={() => {
                    applyTheme(th.name);
                    onChange();
                  }}
                  className={`w-6 h-6 rounded-full ${th.color} flex items-center justify-center transition-all ${
                    theme === th.name ? `ring-2 ring-offset-2 ring-offset-surface-0 ${th.ring}` : ''
                  }`}
                >
                  {theme === th.name && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          )}

          <button
            aria-label={t('fab.theme')}
            title={t('fab.theme')}
            aria-expanded={paletteOpen}
            onClick={() => setPaletteOpen((o) => !o)}
            className={`${itemCls} ${paletteOpen ? activeCls : idleCls}`}
          >
            <Palette className="w-5 h-5" />
          </button>

          <button
            aria-label={t('fab.scheme')}
            title={scheme === 'dark' ? t('fab.toLight') : t('fab.toDark')}
            onClick={() => {
              applyColorScheme(scheme === 'dark' ? 'light' : 'dark');
              onChange();
            }}
            className={`${itemCls} ${idleCls}`}
          >
            {scheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            aria-label={t('action.settings')}
            title={t('action.settings')}
            onClick={() => {
              close();
              onOpenSettings();
            }}
            className={`${itemCls} ${idleCls}`}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>
      )}

      <button
        aria-label="quick-controls"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="bg-brand-600 text-white rounded-full shadow-md w-12 h-12 flex items-center justify-center hover:bg-brand-700 transition-all active:scale-95 shrink-0"
      >
        <SlidersHorizontal className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
    </div>
  );
}
