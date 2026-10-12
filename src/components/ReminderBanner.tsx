import { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Reminders } from '@/lib/reminders';
import type { Subscription, StoredValueCard } from '@/lib/types';
import ReminderList from './ReminderList';

interface Props {
  /** 与铃铛、每日 webhook 同一套口径的提醒结果 */
  reminders: Reminders;
  /** 就地处理：订阅续订 / 结束，储值卡延期 / 结束 */
  onRenewSub?: (s: Subscription) => void;
  onEndSub?: (s: Subscription) => void;
  onExtendCard?: (c: StoredValueCard) => void;
  onEndCard?: (c: StoredValueCard) => void;
}

const DISMISS_KEY = 'asset_tracker_reminder_dismissed';

/** 顶部横幅。数字直接来自 collectReminders —— 与铃铛、每日 webhook 同一套口径。
 *  「去处理」就地展开提醒列表，就地续订 / 延期 / 结束 ——
 *  以前它只把 tab 切到订阅页，默认已在订阅页时是空操作，储值卡的提醒还会被跳错页。 */
export default function ReminderBanner({ reminders, onRenewSub, onEndSub, onExtendCard, onEndCard }: Props) {
  const { t } = useTranslation();
  const { dueSubs, expiringCards, overdueSubs, overdueCards, remindSubs, remindCards, count } = reminders;
  const due = dueSubs.length;
  const expiring = expiringCards.length;
  const overdue = overdueSubs.length + overdueCards.length;
  const remind = remindSubs.length + remindCards.length;
  const signature = `${due}:${expiring}:${overdue}:${remind}`;
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // A dismissal is remembered only for the exact set of items it was made
  // against; anything new brings the banner back.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === signature);
    } catch {
      setDismissed(false);
    }
  }, [signature]);

  if (count === 0) return null;
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
  if (overdue) parts.push(t('reminder.partOverdue', { n: overdue }));
  if (due) parts.push(t('reminder.partDue', { n: due }));
  if (expiring) parts.push(t('reminder.partCards', { n: expiring }));
  if (remind) parts.push(t('reminder.partReminders', { n: remind }));

  return (
    <div className="mb-6 border-l-2 border-warn bg-warn-soft">
      <div className="px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm text-warn">
          <p className="font-medium">{t('reminder.text')}</p>
          <p className="mt-0.5">{parts.join(' · ')}</p>
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-600 transition-colors"
          >
            {expanded ? t('reminder.collapse') : t('reminder.goHandle')}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
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

      {expanded && (
        <div className="px-4 pb-3 border-t border-warn/20 pt-2">
          <ReminderList
            reminders={reminders}
            onRenewSub={onRenewSub}
            onEndSub={onEndSub}
            onExtendCard={onExtendCard}
            onEndCard={onEndCard}
            onAction={() => setExpanded(false)}
          />
        </div>
      )}
    </div>
  );
}
