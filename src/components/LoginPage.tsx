import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  mode: 'setup' | 'login';
  onSetup: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onSignIn: (password: string) => Promise<{ ok: boolean; error?: string }>;
}

const ERROR_MSG_KEY: Record<string, string> = {
  empty: 'login.errorEmpty',
  weak_password: 'login.errorWeakPassword',
  already_set: 'login.errorAlreadySet',
  not_initialized: 'login.errorNotInitialized',
  wrong_password: 'login.errorWrongPassword',
  mismatch: 'login.errorMismatch',
};

export default function LoginPage({ mode, onSetup, onSignIn }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
    setPassword('');
    setConfirm('');
  }, [mode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'setup' && password !== confirm) {
      setError(t('login.errorMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const result = mode === 'setup' ? await onSetup(password) : await onSignIn(password);
      if (!result.ok) {
        setError(t(ERROR_MSG_KEY[result.error || 'unknown'] || 'login.errorUnknown'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-2">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shadow-md">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="bg-surface-0 rounded-xl shadow-lg border border-surface-3 p-8">
          <h1 className="text-xl font-bold text-center text-ink-900">
            {mode === 'setup' ? t('login.setupTitle') : t('login.title')}
          </h1>
          <p className="text-sm text-ink-500 text-center mt-1">
            {mode === 'setup' ? t('login.setupSubtitle') : t('login.subtitle')}
          </p>

          <form onSubmit={onSubmit} className="space-y-3 mt-6">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                {mode === 'setup' ? t('login.newPassword') : t('login.password')} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'setup' ? t('login.passwordPlaceholder') : t('login.passwordEnter')}
                className="w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
              />
            </div>
            {mode === 'setup' && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">{t('login.confirmPassword')} *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
                />
                <p className="text-xs text-ink-500 mt-1">{t('login.passwordHint')}</p>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-500 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'setup' ? (
                t('login.setup')
              ) : (
                t('login.signin')
              )}
            </button>
          </form>
        </div>
        <p className="text-xs text-ink-400 text-center mt-6">{t('login.privacy')}</p>
      </div>
    </div>
  );
}
