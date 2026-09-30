import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft } from 'lucide-react';
import { usePopoverPosition, isInside } from '@/hooks/usePopoverPosition';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const WEEK: Record<string, string[]> = {
  'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
  'en-US': ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromISO(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const PANEL_W = 288;

export default function DatePicker({ value, onChange, placeholder = '选择日期', className = '', ariaLabel }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const today = new Date();
  const initial = fromISO(value) ?? null;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(initial ?? today);
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = usePopoverPosition(open, anchorRef, panelRef, { matchWidth: false, width: PANEL_W });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isInside(e.target, anchorRef, panelRef)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selected = fromISO(value);
  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const startDay = monthStart.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(view.getFullYear(), view.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);

  const years = Array.from({ length: 12 }, (_, i) => view.getFullYear() - 6 + i);
  const monthLabel =
    lang === 'en-US' ? view.toLocaleDateString('en-US', { month: 'short' }) : `${view.getMonth() + 1}月`;

  const shiftMonth = (n: number) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));

  return (
    <div className={`relative ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((o) => !o);
          setMode('day');
        }}
        className="w-full bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-3 py-1.5 text-sm text-left text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors flex items-center gap-2"
      >
        <Calendar className="w-4 h-4 text-ink-400 shrink-0" />
        <span className={value ? '' : 'text-ink-400'}>{value || placeholder}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            className="z-[70] overflow-auto bg-surface-0 border border-surface-3 rounded-xl shadow-lg p-3 scrollbar-thin"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))}
                  aria-label="prev year"
                  className="w-7 h-7 rounded-lg text-ink-700 hover:bg-surface-2 flex items-center justify-center transition-colors"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="prev month"
                  className="w-7 h-7 rounded-lg text-ink-700 hover:bg-surface-2 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMode((m) => (m === 'day' ? 'month' : 'day'))}
                className="text-sm font-semibold text-ink-900 px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                {view.getFullYear()} {monthLabel}
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="next month"
                  className="w-7 h-7 rounded-lg text-ink-700 hover:bg-surface-2 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))}
                  aria-label="next year"
                  className="w-7 h-7 rounded-lg text-ink-700 hover:bg-surface-2 flex items-center justify-center transition-colors rotate-180"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {mode === 'day' && (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-500 mb-1">
                  {WEEK[lang].map((w, i) => (
                    <div key={i} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const isToday = sameDay(d, today);
                    const isSel = selected && sameDay(d, selected);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onChange(toISO(d));
                          setOpen(false);
                        }}
                        className={`aspect-square text-sm rounded-lg transition-colors ${
                          isSel
                            ? 'bg-brand-600 text-white font-semibold'
                            : isToday
                              ? 'border border-brand-500 text-brand-700 dark:text-brand-500 font-semibold'
                              : 'text-ink-700 hover:bg-brand-50 dark:hover:bg-brand-900/30'
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mode === 'month' && (
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setView(new Date(view.getFullYear(), i, 1));
                      setMode('day');
                    }}
                    className={`py-2 text-sm rounded-lg transition-colors ${
                      i === view.getMonth()
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-ink-700 hover:bg-brand-50 dark:hover:bg-brand-900/30'
                    }`}
                  >
                    {lang === 'en-US'
                      ? new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' })
                      : `${i + 1}月`}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-surface-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onChange(toISO(today));
                  setOpen(false);
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
              >
                {t('date.today')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toISO(new Date(today.getTime() + 7 * 86400000)));
                  setOpen(false);
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
              >
                {t('date.plus7')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toISO(new Date(today.getTime() + 30 * 86400000)));
                  setOpen(false);
                }}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
              >
                {t('date.plus30')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1 rounded hover:bg-surface-2 transition-colors ml-auto"
              >
                {t('date.clear')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
