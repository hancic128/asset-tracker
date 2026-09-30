import { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, CreditCard, Clock, CheckCircle2, Webhook, ListChecks, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Subscription, StoredValueCard } from '@/lib/types';
import { isExpiringSoon, isNearExpiry, fmtDate, currencySymbol } from '@/lib/utils';

interface Props {
  subs: Subscription[];
  cards: StoredValueCard[];
  webhookConfigured: boolean;
  onSignOut: () => void;
}

function daysUntil(iso?: string | null): number {
  if (!iso) return Infinity;
  const now = new Date();
  const today = new Date(now.toDateString());
  return Math.round((new Date(new Date(iso).toDateString()).getTime() - today.getTime()) / 86400000);
}

export default function Header({ subs, cards, webhookConfigured, onSignOut }: Props) {
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

  const dueSubs = subs
    .filter((s) => s.status === 'active' && isExpiringSoon(s.end_date))
    .map((s) => ({ ...s, days: daysUntil(s.end_date) }))
    .sort((a, b) => a.days - b.days);

  const expiringCards = cards
    .filter((c) => c.status === 'active' && isNearExpiry(c.expires_at))
    .map((c) => ({ ...c, days: daysUntil(c.expires_at) }))
    .sort((a, b) => a.days - b.days);

  // explicit renewal reminders the user ticked in the dialog
  const reminders = [
    ...subs
      .filter((s) => s.remind_enabled && s.remind_date && s.status === 'active')
      .map((s) => ({ key: `s-${s.id}`, name: s.name, date: s.remind_date as string, days: daysUntil(s.remind_date) })),
    ...cards
      .filter((c) => c.remind_enabled && c.remind_date && c.status === 'active')
      .map((c) => ({ key: `c-${c.id}`, name: c.name, date: c.remind_date as string, days: daysUntil(c.remind_date) })),
  ]
    .filter((r) => r.days >= -30 && r.days <= 30)
    .sort((a, b) => a.days - b.days);

  const count = dueSubs.length + expiringCards.length + reminders.length;
  const dayLabel = (d: number) => (d <= 0 ? t('notify.today') : t('notify.daysLeft', { n: d }));

  return (
    <header className="flex justify-between items-center mb-6 gap-3">
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* logo — same credit-card mark as the favicon */}
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
          <CreditCard className="w-5 h-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-ink-900 truncate leading-tight">{t('app.title')}</h1>
          <p className="text-xs text-ink-500 truncate hidden sm:block">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={t('action.notify')}
            aria-expanded={open}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative ${
              open ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'hover:bg-surface-2 text-ink-700 '
            }`}
          >
            <Bell className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface-0 border border-surface-3 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-3">
                <p className="text-sm font-semibold text-ink-900">{t('notify.title')}</p>
                <p className="text-xs text-ink-500 mt-0.5">{t('notify.subtitle')}</p>
              </div>

              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {count === 0 && (
                  <div className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm text-ink-500">{t('notify.empty')}</p>
                  </div>
                )}

                {dueSubs.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-medium text-ink-500 mb-2">
                      {t('notify.subsDue')} · {dueSubs.length}
                    </p>
                    <ul className="space-y-1">
                      {dueSubs.map((s) => (
                        <li key={s.id ?? s.name} className="flex items-center gap-3 py-1.5">
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="text-sm text-ink-900 flex-1 truncate">{s.name}</span>
                          <span className="text-xs text-amber-700 shrink-0">{dayLabel(s.days)}</span>
                          <span className="text-sm num text-ink-700 shrink-0">
                            {currencySymbol(s.currency)}
                            {Number(s.amount).toFixed(0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reminders.length > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-2">
                      {t('notify.reminders')} · {reminders.length}
                    </p>
                    <ul className="space-y-1">
                      {reminders.map((r) => (
                        <li key={r.key} className="flex items-center gap-3 py-1.5">
                          <BellRing className="w-4 h-4 text-brand-600 shrink-0" />
                          <span className="text-sm text-ink-900 dark:text-surface-0 flex-1 truncate">{r.name}</span>
                          <span className="text-xs text-brand-600 shrink-0">{dayLabel(r.days)}</span>
                          <span className="text-xs text-ink-500 dark:text-ink-400 shrink-0">{r.date}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {expiringCards.length > 0 && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-xs font-medium text-ink-500 mb-2">
                      {t('notify.cardsExpiring')} · {expiringCards.length}
                    </p>
                    <ul className="space-y-1">
                      {expiringCards.map((c) => (
                        <li key={c.id ?? c.name} className="flex items-center gap-3 py-1.5">
                          <ListChecks className="w-4 h-4 text-amber-700 shrink-0" />
                          <span className="text-sm text-ink-900 flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-amber-700 shrink-0">{dayLabel(c.days)}</span>
                          <span className="text-xs text-ink-500 shrink-0">{fmtDate(c.expires_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-surface-3 flex items-start gap-2 bg-surface-1">
                <Webhook className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
                <p className="text-xs text-ink-500 leading-relaxed">
                  {webhookConfigured ? t('notify.webhookOn') : t('notify.webhookOff')}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          aria-label={t('login.signout')}
          title={t('login.signout')}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-900 hover:bg-surface-2 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
