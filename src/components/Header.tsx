import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  Bell,
  LogOut,
  CreditCard,
  Clock,
  CheckCircle2,
  Webhook,
  ListChecks,
  BellRing,
  AlertTriangle,
  RefreshCw,
  CalendarPlus,
  Ban,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Subscription, StoredValueCard } from '@/lib/types';
import { fmtDate, currencySymbol } from '@/lib/utils';
import { collectReminders, DUE_WINDOW_DAYS, CARD_WINDOW_DAYS } from '@/lib/reminders';

interface Props {
  subs: Subscription[];
  cards: StoredValueCard[];
  webhookConfigured: boolean;
  onSignOut: () => void;
  /** 提醒项就地处理：续订 / 结束订阅，延期 / 结束储值卡 */
  onRenewSub?: (s: Subscription) => void;
  onEndSub?: (s: Subscription) => void;
  onExtendCard?: (c: StoredValueCard) => void;
  onEndCard?: (c: StoredValueCard) => void;
}

export default function Header({
  subs,
  cards,
  webhookConfigured,
  onSignOut,
  onRenewSub,
  onEndSub,
  onExtendCard,
  onEndCard,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // 判据全部来自 lib/reminders.ts —— 与每日 webhook 摘要同一套口径
  const { dueSubs, expiringCards, overdueSubs, overdueCards, remindSubs, remindCards, count } = collectReminders(
    subs,
    cards,
  );

  const overdueAll = [...overdueSubs, ...overdueCards];

  // 已过时给「已过 N 天」，别说成「今天」
  const dayLabel = (d: number) =>
    d < 0 ? t('notify.daysOverdue', { n: -d }) : d === 0 ? t('notify.today') : t('notify.daysLeft', { n: d });

  // 就地点操作即关闭面板，再由父组件打开对应弹窗 / 确认框
  const act = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  const iconBtn = 'w-7 h-7 inline-flex items-center justify-center transition-colors shrink-0';

  /** 提醒项：左图标 + 名称 + 右侧信息 + 就地操作（续订/延期、结束）。
   *  以前这里只读——看到了到期项却没法处理，得自己切到订阅页再找那一行。 */
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

  const renewIcon = <RefreshCw className="w-3.5 h-3.5" />;
  const extendIcon = <CalendarPlus className="w-3.5 h-3.5" />;

  return (
    <header className="flex justify-between items-center mb-6 gap-3 border-b border-[color:var(--surface-3)] pb-5">
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* logo — same credit-card mark as the favicon. Industrial mono = ink-filled, no shadow. */}
        <div className="w-9 h-9 bg-ink-900 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink-900 truncate leading-tight tracking-tight">{t('app.title')}</h1>
          <p className="text-xs text-ink-500 truncate hidden sm:block">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={t('action.notify')}
            aria-expanded={open}
            className={`w-9 h-9 flex items-center justify-center transition-colors relative ${
              open ? 'bg-surface-1 text-ink-900' : 'hover:bg-surface-1 text-ink-700'
            }`}
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-0 border border-[color:var(--surface-3)] z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[color:var(--surface-3)]">
                <p className="text-sm font-semibold text-ink-900">{t('notify.title')}</p>
                <p className="text-xs text-ink-500 mt-0.5">{t('notify.subtitle')}</p>
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {count === 0 && (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-ok" />
                    <p className="text-sm text-ink-500">{t('notify.empty')}</p>
                  </div>
                )}

                {overdueAll.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-medium text-danger mb-2">
                      {t('notify.overdue')} · {overdueAll.length}
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
                  <div className="px-4 pt-3 pb-1">
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

                {(remindSubs.length > 0 || remindCards.length > 0) && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-medium text-ink-500 mb-2">
                      {t('notify.reminders')} · {remindSubs.length + remindCards.length}
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
                  <div className="px-4 pt-3 pb-3">
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
              </div>

              <div className="px-4 py-3 border-t border-[color:var(--surface-3)] space-y-1.5 bg-surface-1">
                <div className="flex items-start gap-2">
                  <Webhook className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-ink-500 leading-relaxed">
                    {webhookConfigured ? t('notify.webhookOn') : t('notify.webhookOff')}
                  </p>
                </div>
                <p className="text-[11px] text-ink-400 leading-relaxed">
                  {t('notify.rules', { due: DUE_WINDOW_DAYS, card: CARD_WINDOW_DAYS })}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          aria-label={t('login.signout')}
          title={t('login.signout')}
          className="h-9 w-9 flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-surface-1 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
