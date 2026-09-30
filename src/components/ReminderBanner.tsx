import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  expiring: number;
  nearExpiryCards: number;
}

const DISMISS_KEY = 'asset_tracker_reminder_dismissed';

export default function ReminderBanner({ expiring, nearExpiryCards }: Props) {
  const { t } = useTranslation();
  const signature = `${expiring}:${nearExpiryCards}`;
  const [dismissed, setDismissed] = useState(false);

  // A dismissal is remembered only for the exact set of items it was made
  // against; anything new brings the banner back.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === signature);
    } catch {
      setDismissed(false);
    }
  }, [signature]);

  if (expiring === 0 && nearExpiryCards === 0) return null;
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* private mode — dismissing just won't persist */
    }
  };

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-amber-700">
        <p className="font-medium">{t('reminder.text', { expiring, cards: nearExpiryCards })}</p>
        <p className="text-xs mt-1 opacity-80">{t('reminder.hint')}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('action.dismiss')}
        title={t('action.dismiss')}
        className="text-amber-700 hover:opacity-70 transition-opacity shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
