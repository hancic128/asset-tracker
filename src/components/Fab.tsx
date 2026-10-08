import { useState } from 'react';
import { Sun, Moon, MonitorSmartphone, Settings2, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ThemeName, ColorScheme } from '@/lib/types';
import { applyTheme, applyColorScheme } from '@/lib/storage';

interface Props {
  theme: ThemeName;
  scheme: ColorScheme;
  onChange: () => void;
  onOpenSettings: () => void;
}

/** Industrial mono Fab：
 *  - bg surface-1 + hairline border，4px 微圆角，无 shadow
 *  - 主按钮 ink-900 背景
 *  - 删除了原 5 主题选择器（DESIGN.md §This design will NOT use 第 1 条）
 *  - scheme 切换 light → dark → system → light 循环 */
export default function Fab({ theme: _theme, scheme, onChange, onOpenSettings }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const cycleScheme = () => {
    const next: ColorScheme = scheme === 'light' ? 'dark' : scheme === 'dark' ? 'system' : 'light';
    applyColorScheme(next);
    onChange();
  };

  const schemeLabel =
    scheme === 'dark' ? t('fab.toLight') : scheme === 'light' ? t('fab.toDark') : t('fab.toSystem');
  const SchemeIcon = scheme === 'system' ? MonitorSmartphone : scheme === 'dark' ? Sun : Moon;

  const itemCls = `w-10 h-10 bg-surface-1 border border-[color:var(--surface-3)] flex items-center justify-center transition-colors shrink-0`;
  const idleCls = 'text-ink-700 hover:bg-surface-2';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2">
          <button
            aria-label={t('fab.scheme')}
            title={schemeLabel}
            onClick={() => {
              cycleScheme();
              // 同步重绘 favicon（token 颜色没变，但保持一致）
              applyTheme('indigo');
            }}
            className={`${itemCls} ${idleCls}`}
          >
            <SchemeIcon className="w-5 h-5" />
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
        className="bg-ink-900 text-white w-12 h-12 flex items-center justify-center hover:bg-ink-700 transition-colors shrink-0"
      >
        <SlidersHorizontal
          className={`w-5 h-5 transition-transform duration-fast ease-mechanical ${open ? 'rotate-90' : ''}`}
        />
      </button>
    </div>
  );
}