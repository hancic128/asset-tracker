import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onChange: (
    oldPw: string,
    newPw: string,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

const ERROR_MSG_KEY: Record<string, string> = {
  empty: 'login.errorEmpty',
  weak_password: 'login.errorWeakPassword',
  not_initialized: 'login.errorNotInitialized',
  wrong_password: 'login.errorWrongPassword',
  mismatch: 'login.errorMismatch',
};

export default function ChangePasswordModal({ open, onClose, onChange }: Props) {
  const { t } = useTranslation();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setOldPw('');
    setNewPw('');
    setConfirm('');
    setError(null);
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPw !== confirm) {
      setError(t('login.errorMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await onChange(oldPw, newPw);
      if (!result.ok) setError(t(ERROR_MSG_KEY[result.error || 'unknown'] || 'login.errorUnknown'));
      else onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="change-pw"
      open={open}
      onClose={onClose}
      title={t('login.changeTitle')}
      icon={<KeyRound className="w-5 h-5 text-brand-600" />}
    >
      <form onSubmit={onSubmit} className="p-5 space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('login.oldPassword')} *</label>
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className="w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('login.newPassword')} *</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">{t('login.confirmPassword')} *</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
          />
          <p className="text-xs text-ink-500 mt-1">{t('login.passwordHint')}</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-500 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-surface-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-2 rounded-lg transition-colors"
          >
            {t('add.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('login.change')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
