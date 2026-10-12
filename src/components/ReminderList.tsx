import type { ReactNode } from 'react';
import { AlertTriangle, Clock, ListChecks, BellRing, RefreshCw, CalendarPlus, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Reminders } from '@/lib/reminders';
import type { Subscription, StoredValueCard } from '@/lib/types';
import { currencySymbol, fmtDate } from '@/lib/utils';

interface Props {
  reminders: Reminders;
  /** 就地处理：订阅续订 / 结束，储值卡延期 / 结束 */
  onRenewSub?: (s: Subscription) => void;
  onEndSub?: (s: Subscription) => void;
  onExtendCard?: (c: StoredValueCard) => void;
  onEndCard?: (c: StoredValueCard) => void;
  /** 任一操作触发前回调 —— 横幅借此在打开弹窗前收起展开区 */
  onAction?: () => void;
}

/** 提醒项列表：左图标 + 名称 + 右侧信息 + 就地操作。
 *
 *  铃铛面板与顶部横幅共用同一份渲染与同一套口径（collectReminders）——
 *  以前横幅只给一个「去处理」跳转按钮，切到已在的 tab 时是空操作，
 *  储值卡的提醒还会被跳到订阅页；这里收敛成「看到即可处理」。 */
export default function ReminderList({ reminders, onRenewSub, onEndSub, onExtendCard, onEndCard, onAction }: Props) {
  const { t } = useTranslation();
  const { dueSubs, expiringCards, overdueSubs, overdueCards, remindSubs, remindCards } = reminders;

  const iconBtn = 'w-7 h-7 inline-flex items-center justify-center transition-colors shrink-0';
  const renewIcon = <RefreshCw className="w-3.5 h-3.5" />;
  const extendIcon = <CalendarPlus className="w-3.5 h-3.5" />;

  // 已过时给「已过 N 天」，别说成「今天」
  const dayLabel = (d: number) =>
    d < 0 ? t('notify.daysOverdue', { n: -d }) : d === 0 ? t('notify.today') : t('notify.daysLeft', { n: d });

  const act = (fn?: () => void) => {
    onAction?.();
    fn?.();
  };

  const row = (opts: {
    key: string;
    icon: ReactNode;
    name: string;
    right?: ReactNode;
    renewLabel?: string;
    renewIcon?: ReactNode;
    onRenew?: () => void;
    onEnd?: () => void;
  }) => (
    <li key={opts.key} className="flex items-center gap-2 py-1.5">
      {opts.icon}
      <span className="text-sm text-ink-900 flex-1 truncate">{opts.name}</span>
      {opts.right}
      {opts.onRenew && (
        <button
          onClick={() => act(opts.onRenew)}
          aria-label={opts.renewLabel}
          title={opts.renewLabel}
          className={`${iconBtn} text-ink-400 hover:text-brand-600 hover:bg-surface-2`}
        >
          {opts.renewIcon}
        </button>
      )}
      {opts.onEnd && (
        <button
          onClick={() => act(opts.onEnd)}
          aria-label={t('action.end')}
          title={t('action.end')}
          className={`${iconBtn} text-ink-400 hover:text-danger hover:bg-danger-soft`}
        >
          <Ban className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  );

  const overdueAll = overdueSubs.length + overdueCards.length;
  const remindAll = remindSubs.length + remindCards.length;

  return (
    <>
      {overdueAll > 0 && (
        <div className="pt-1">
          <p className="text-xs font-medium text-danger mb-2">
            {t('notify.overdue')} · {overdueAll}
          </p>
          <ul>
            {overdueSubs.map((r) =>
              row({
                key: `o-s-${r.item.id}`,
                icon: <AlertTriangle className="w-4 h-4 text-danger shrink-0" />,
                name: r.item.name,
                right: <span className="text-xs text-danger shrink-0">{dayLabel(r.days)}</span>,
                renewLabel: t('action.renew'),
                renewIcon,
                onRenew: onRenewSub && (() => onRenewSub(r.item)),
                onEnd: onEndSub && (() => onEndSub(r.item)),
              }),
            )}
            {overdueCards.map((r) =>
              row({
                key: `o-c-${r.item.id}`,
                icon: <AlertTriangle className="w-4 h-4 text-danger shrink-0" />,
                name: r.item.name,
                right: <span className="text-xs text-danger shrink-0">{dayLabel(r.days)}</span>,
                renewLabel: t('action.extend'),
                renewIcon: extendIcon,
                onRenew: onExtendCard && (() => onExtendCard(r.item)),
                onEnd: onEndCard && (() => onEndCard(r.item)),
              }),
            )}
          </ul>
        </div>
      )}

      {dueSubs.length > 0 && (
        <div className="pt-3">
          <p className="text-xs font-medium text-ink-500 mb-2">
            {t('notify.subsDue')} · {dueSubs.length}
          </p>
          <ul>
            {dueSubs.map((r) =>
              row({
                key: `d-s-${r.item.id}`,
                icon: <Clock className="w-4 h-4 text-warn shrink-0" />,
                name: r.item.name,
                right: (
                  <>
                    <span className="text-xs text-warn shrink-0">{dayLabel(r.days)}</span>
                    <span className="text-sm num text-ink-700 shrink-0">
                      {currencySymbol(r.item.currency)}
                      {Number(r.item.amount).toFixed(0)}
                    </span>
                  </>
                ),
                renewLabel: t('action.renew'),
                renewIcon,
                onRenew: onRenewSub && (() => onRenewSub(r.item)),
              }),
            )}
          </ul>
        </div>
      )}

      {remindAll > 0 && (
        <div className="pt-3">
          <p className="text-xs font-medium text-ink-500 mb-2">
            {t('notify.reminders')} · {remindAll}
          </p>
          <ul>
            {remindSubs.map((r) =>
              row({
                key: `r-s-${r.item.id}`,
                icon: <BellRing className="w-4 h-4 text-brand-600 shrink-0" />,
                name: r.item.name,
                right: <span className="text-xs text-brand-600 shrink-0">{r.item.remind_date}</span>,
                renewLabel: t('action.renew'),
                renewIcon,
                onRenew: onRenewSub && (() => onRenewSub(r.item)),
              }),
            )}
            {remindCards.map((r) =>
              row({
                key: `r-c-${r.item.id}`,
                icon: <BellRing className="w-4 h-4 text-brand-600 shrink-0" />,
                name: r.item.name,
                right: <span className="text-xs text-brand-600 shrink-0">{r.item.remind_date}</span>,
                renewLabel: t('action.extend'),
                renewIcon: extendIcon,
                onRenew: onExtendCard && (() => onExtendCard(r.item)),
              }),
            )}
          </ul>
        </div>
      )}

      {expiringCards.length > 0 && (
        <div className="pt-3">
          <p className="text-xs font-medium text-ink-500 mb-2">
            {t('notify.cardsExpiring')} · {expiringCards.length}
          </p>
          <ul>
            {expiringCards.map((r) =>
              row({
                key: `e-c-${r.item.id}`,
                icon: <ListChecks className="w-4 h-4 text-warn shrink-0" />,
                name: r.item.name,
                right: (
                  <>
                    <span className="text-xs text-warn shrink-0">{dayLabel(r.days)}</span>
                    <span className="text-xs text-ink-500 shrink-0">{fmtDate(r.item.expires_at)}</span>
                  </>
                ),
                renewLabel: t('action.extend'),
                renewIcon: extendIcon,
                onRenew: onExtendCard && (() => onExtendCard(r.item)),
              }),
            )}
          </ul>
        </div>
      )}
    </>
  );
}
