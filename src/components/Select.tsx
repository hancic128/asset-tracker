import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { usePopoverPosition, isInside } from '@/hooks/usePopoverPosition';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export default function Select({ value, onChange, options, placeholder, className = '', ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const style = usePopoverPosition(open, anchorRef, panelRef, { matchWidth: true, maxHeight: 240 });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isInside(e.target, anchorRef, panelRef)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const current = options.find((o) => o.value === value);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[activeIdx];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="w-full bg-surface-1 border border-surface-3 rounded-lg pl-3 pr-8 py-1.5 text-sm text-left text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors flex items-center justify-between"
      >
        <span className={`truncate ${current ? '' : 'text-ink-400'}`}>
          {current ? current.label : (placeholder ?? '')}
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            style={style}
            className="z-[70] overflow-auto bg-surface-0 border border-surface-3 rounded-lg shadow-lg py-1 scrollbar-thin"
          >
            {options.map((opt, i) => {
              const selected = opt.value === value;
              const active = i === activeIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    active ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-500' : 'text-ink-700 '
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
