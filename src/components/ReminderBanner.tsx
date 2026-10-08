import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** 订阅：7 天内扣费 */
  due: number;
  /** 储值卡：30 天内过期 */
  expiringCards: number;
  /** 用户自设的续费提醒：已到日 */
  reminders: number;
}

const DISMISS_KEY = 'asset_tracker_reminder_dismissed';

/** 顶部横幅。数字直接来自 collectReminders —— 与铃铛、每日 webhook 同一套口径。
 *  Industrial mono: 单边 hairline + bg-tinted，无圆角无 shadow。 */
export default function ReminderBanner({ due, expiringCards, reminders }: Props) {
  const { t } = useTranslation();
  const signature = `${due}:${expiringCards}:${reminders}`;
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

  const total = due + expiringCards + reminders;
  if (total === 0) return null;
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* private mode — dismissing just won't persist */
    }
  };

  const parts: string[] = [];
  if (due) parts.push(t('reminder.partDue', { n: due }));
  if (expiringCards) parts.push(t('reminder.partCards', { n: expiringCards }));
  if (reminders) parts.push(t('reminder.partReminders', { n: reminders }));

  return (
    <div className="mb-6 border-l-2 border-warn bg-warn-soft px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-warn">
        <p className="font-medium">{t('reminder.text')}</p>
        <p className="mt-0.5">{parts.join(' · ')}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('action.dismiss')}
        title={t('action.dismiss')}
        className="text-warn hover:opacity-70 transition-opacity shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}