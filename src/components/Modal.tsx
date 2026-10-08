import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  icon?: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

/**
 * Industrial mono modal:
 * - backdrop 纯 ink scrim（bg-ink-900/40），无 backdrop-blur（避免玻璃感）
 * - 主体 surface-0、4px 微圆角、hairline border，无 shadow
 * - 顶部 sticky 头，hairline 分割
 */
export default function Modal({ id, title, icon, open, onClose, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      id={id}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40"
      onClick={onClose}
    >
      <div
        className={`bg-surface-0 border border-[color:var(--surface-3)] w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[color:var(--surface-3)] flex justify-between items-center sticky top-0 bg-surface-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          </div>
          <button onClick={onClose} aria-label="close" className="text-ink-500 hover:text-ink-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}