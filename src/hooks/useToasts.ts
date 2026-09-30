import { useState, useCallback } from 'react';
import type { ToastItem } from '@/lib/types';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((level: ToastItem['level'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, level, message }]);
    if (level === 'success' || level === 'info') {
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    }
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  return { toasts, show, dismiss };
}
