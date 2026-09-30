import { Wallet, Clock, CreditCard, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Stats } from '@/lib/types';

interface Props {
  stats: Stats;
}

const fmt = (n: number) => n.toFixed(2);

export default function StatCards({ stats }: Props) {
  const { t } = useTranslation();
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-surface-0 rounded-xl border border-surface-3 shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs text-ink-500 font-medium">{t('stat.daily')}</p>
          <Wallet className="w-4 h-4 text-ink-400" />
        </div>
        <p className="text-lg font-bold num text-ink-900">¥{fmt(stats.daily)}</p>
        <p className="text-xs text-ink-400 mt-1">
          {t('stat.monthly')} ¥{Math.round(stats.monthly)}
        </p>
      </div>
      <div className="bg-surface-0 rounded-xl border border-surface-3 shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs text-ink-500 font-medium">{t('stat.expiring')}</p>
          <Clock className="w-4 h-4 text-amber-700" />
        </div>
        <p className="text-lg font-bold num text-amber-700">
          {stats.expiring} <span className="text-sm font-medium">{t('unit.item')}</span>
        </p>
        <p className="text-xs text-ink-400 mt-1">
          {t('stat.expiringAmount')} ¥{fmt(stats.expiringAmount)}
        </p>
      </div>
      <div className="bg-surface-0 rounded-xl border border-surface-3 shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs text-ink-500 font-medium">{t('stat.balance')}</p>
          <CreditCard className="w-4 h-4 text-ink-400" />
        </div>
        <p className="text-lg font-bold num text-ink-900">¥{fmt(stats.balance)}</p>
        <p className="text-xs text-ink-400 mt-1">{t('stat.cardCount', { n: stats.cardCount })}</p>
      </div>
      <div className="bg-surface-0 rounded-xl border border-surface-3 shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs text-ink-500 font-medium">{t('stat.uses')}</p>
          <ListChecks className="w-4 h-4 text-ink-400" />
        </div>
        <p className="text-lg font-bold num text-ink-900">
          {stats.totalUses} {t('unit.times')}
        </p>
        <p className="text-xs text-ink-400 mt-1 truncate">—</p>
      </div>
    </section>
  );
}
