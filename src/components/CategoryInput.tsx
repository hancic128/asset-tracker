import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Tag, ChevronDown, X, Plus } from 'lucide-react';
import { usePopoverPosition, isInside } from '@/hooks/usePopoverPosition';

interface Props {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
  onDeleteCategory: (c: string) => void;
  placeholder?: string;
}

export default function CategoryInput({ value, onChange, categories, onDeleteCategory, placeholder }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = usePopoverPosition(open, anchorRef, panelRef, { matchWidth: true, maxHeight: 240 });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isInside(e.target, anchorRef, panelRef)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => categories.filter((c) => !q || c.toLowerCase().includes(q)), [categories, q]);
  const canCreate = !!value.trim() && !categories.some((c) => c.toLowerCase() === q);

  return (
    <div ref={anchorRef} className="relative">
      <div className="relative">
        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-surface-3 rounded-lg pl-8 pr-8 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
        />
        <button
          type="button"
          aria-label={t('category.browse')}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            className="z-[70] overflow-auto bg-surface-0 border border-surface-3 rounded-lg shadow-lg py-1 scrollbar-thin"
          >
            {canCreate && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                {t('category.create', { name: value.trim() })}
              </button>
            )}

            {filtered.length === 0 && !canCreate && (
              <div className="px-3 py-2 text-xs text-ink-400">{t('category.empty')}</div>
            )}

            {filtered.map((c) => (
              <div key={c} className="flex items-center group">
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={`flex-1 text-left px-3 py-1.5 text-sm text-ink-700 hover:bg-brand-50 transition-colors ${
                    c === value ? 'text-brand-600 font-medium' : ''
                  }`}
                >
                  {c}
                </button>
                <button
                  type="button"
                  aria-label={t('category.delete', { name: c })}
                  title={t('category.delete', { name: c })}
                  onClick={() => onDeleteCategory(c)}
                  className="px-2 py-1.5 text-ink-400 hover:text-rose-600 transition-colors mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
