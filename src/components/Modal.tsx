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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-surface-0 rounded-xl shadow-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-surface-3 flex justify-between items-center sticky top-0 bg-surface-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          </div>
          <button onClick={onClose} aria-label="close" className="text-ink-500 hover:text-ink-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
