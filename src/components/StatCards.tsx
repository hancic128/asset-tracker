import { useTranslation } from 'react-i18next';
import type { Stats } from '@/lib/types';

interface Props {
  stats: Stats;
}

const fmt = (n: number) => n.toFixed(2);

/**
 * Industrial mono tabular 统计条：
 * - 4 列等宽，列间 hairline（divide-x）分隔
 * - 无 icon、无 card、无 shadow —— 靠分割线造层次
 * - 数字 31px（text-3xl）+ tabular nums；label uppercase + tracking-wide
 * - 数字右对齐、label 左对齐；桌面 4 列 / 移动端 2x2
 */
export default function StatCards({ stats }: Props) {
  const { t } = useTranslation();
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[color:var(--surface-3)] border-y border-[color:var(--surface-3)] mb-6">
      <Cell label={t('stat.daily')} value={`¥${fmt(stats.daily)}`}>
        <span className="block mt-1 text-xs text-ink-500">
          {t('stat.monthly')} ¥{Math.round(stats.monthly)}
        </span>
      </Cell>

      <Cell
        label={t('stat.expiring')}
        value={
          <>
            {stats.expiring} <span className="text-base font-normal text-ink-500">{t('unit.item')}</span>
          </>
        }
        tone={stats.expiring > 0 ? 'warn' : 'muted'}
      >
        <span className="block mt-1 text-xs text-ink-500">
          {t('stat.expiringAmount')} ¥{fmt(stats.expiringAmount)}
        </span>
      </Cell>

      <Cell label={t('stat.balance')} value={`¥${fmt(stats.balance)}`}>
        <span className="block mt-1 text-xs text-ink-500">
          {t('stat.cardCount', { n: stats.cardCount })}
        </span>
      </Cell>

      <Cell
        label={t('stat.uses')}
        value={
          <>
            {stats.totalUses} <span className="text-base font-normal text-ink-500">{t('unit.times')}</span>
          </>
        }
      />
    </section>
  );
}

interface CellProps {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
  tone?: 'default' | 'warn' | 'muted';
}

function Cell({ label, value, children, tone = 'default' }: CellProps) {
  const valueCls =
    tone === 'warn'
      ? 'num mt-1 text-3xl text-warn leading-none'
      : tone === 'muted'
        ? 'num mt-1 text-3xl text-ink-700 leading-none'
        : 'num mt-1 text-3xl text-ink-900 leading-none font-medium';
  return (
    <div className="px-5 py-4 lg:py-5 flex flex-col">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className={valueCls}>{value}</p>
      {children}
    </div>
  );
}