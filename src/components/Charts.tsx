import { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { useTranslation } from 'react-i18next';
import type { Subscription } from '@/lib/types';
import { toCNY, amortisedAmount, toISO } from '@/lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler);

interface Props {
  subs: Subscription[];
  usdRate: number;
}

type ViewMode = 'month' | 'day';
type SplitMode = 'category' | 'item';

const DAY = 86400000;
const MONTHS_SHOWN = 12;
const DAYS_SHOWN = 30;

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const money = (n: number) => `¥${n.toFixed(2)}`;

/** 每日成本只在订阅有效期内计。
 *
 *  以前是「金额 ÷ 周期天数」无差别铺到每一天、每个月，导致订阅结束之后还在继续计费
 *  （一年期的订阅结束后，趋势图上的柱子照样月月都在）。现在统一走
 *  amortisedAmount：金额 ÷ 有效期天数 × 与目标区间的重叠天数，区间外为 0。
 */
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Industrial mono Charts:
 * - 顶部 section 不再是 card：去 bg/rounded/border/shadow
 * - 主图：hairline y grid + 隐藏 x grid + 单一 brand-600
 * - Top10 列表去掉 Trophy 装饰；改为纯文字 + tabular nums
 * - doughnut 配色：brand 主色 + ink-cool ramp（≤6 色，全在 cool gray 谱内，符合 ≤3 active hues）
 * - segmented control：active 用 ink-900 bg + 白字；inactive 透明
 */
export default function Charts({ subs, usdRate }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en-US' ? 'en-US' : 'zh-CN';
  const [mode, setMode] = useState<ViewMode>('month');
  const [split, setSplit] = useState<SplitMode>('category');

  const active = useMemo(() => subs.filter((s) => s.status === 'active'), [subs]);

  const brand = cssVar('--brand-600');
  const ink500 = cssVar('--ink-500');
  const ink700 = cssVar('--ink-700');
  const ink900 = cssVar('--ink-900');
  const surface0 = cssVar('--surface-0');
  const surface3 = cssVar('--surface-3');

  const cny = useMemo(
    () => active.map((s) => ({ ...s, amountCNY: toCNY(Number(s.amount) || 0, s.currency, usdRate) })),
    [active, usdRate],
  );

  // ---------- trend ----------
  // 每个 active 订阅只在**自己的有效期内**按日摊：金额 ÷ 有效期天数 × 与目标区间的重叠天数。
  // 月视图一个桶 = 那个自然月，日视图一个桶 = 那一天；订阅结束后桶里就是 0。
  const trend = useMemo(() => {
    const today = startOfDay(new Date());
    const isMonth = mode === 'month';

    if (isMonth) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const labels: string[] = [];
      const values: number[] = [];
      for (let i = 0; i < MONTHS_SHOWN; i++) {
        const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
        const monthFrom = toISO(d);
        const monthTo = toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        const mon = lang === 'en-US' ? d.toLocaleDateString('en-US', { month: 'short' }) : `${d.getMonth() + 1}月`;
        labels.push(
          d.getMonth() === 0 || i === 0
            ? lang === 'en-US'
              ? `${mon} ${d.getFullYear()}`
              : `${d.getFullYear()}年${mon}`
            : mon,
        );
        const monthly = cny.reduce((sum, s) => sum + amortisedAmount(s, s.amountCNY, monthFrom, monthTo), 0);
        values.push(Number(monthly.toFixed(2)));
      }
      return { labels, values };
    }

    const labels: string[] = [];
    const values: number[] = [];
    for (let i = 0; i < DAYS_SHOWN; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = toISO(d);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      const day = cny.reduce((sum, s) => sum + amortisedAmount(s, s.amountCNY, iso, iso), 0);
      values.push(Number(day.toFixed(2)));
    }
    return { labels, values };
  }, [cny, mode, lang]);

  // 占比 / Top10 跟着月/日开关走：「月」= 未来 30 天合计（与 StatCards 的月预估同口径），
  // 「日」= 今天。两者都只统计落在各自有效期内的部分。
  const topWindow = useMemo(() => {
    const today = startOfDay(new Date());
    const from = toISO(today);
    return {
      from,
      to: toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 29)),
      day: from,
    };
  }, []);

  const isMonth = mode === 'month';

  // ---------- split ----------
  const splitData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of cny) {
      const amount = isMonth
        ? amortisedAmount(s, s.amountCNY, topWindow.from, topWindow.to)
        : amortisedAmount(s, s.amountCNY, topWindow.day, topWindow.day);
      if (amount <= 0) continue;
      const key = split === 'category' ? s.category?.trim() || t('chart.other') : s.name;
      map.set(key, (map.get(key) ?? 0) + amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [cny, split, t, topWindow, isMonth]);

  // ---------- top 10 ----------
  const top10 = useMemo(() => {
    const today = topWindow.from;
    return cny
      .map((s) => {
        const monthly = amortisedAmount(s, s.amountCNY, topWindow.from, topWindow.to);
        const daily = amortisedAmount(s, s.amountCNY, today, today);
        return { name: s.name, monthly, daily, end: s.end_date };
      })
      .filter((it) => it.monthly > 0 || it.daily > 0)
      .sort((a, b) => (mode === 'month' ? b.monthly - a.monthly : b.daily - a.daily))
      .slice(0, 10);
  }, [cny, mode, topWindow]);

  const topMax = top10.length ? (mode === 'month' ? top10[0].monthly : top10[0].daily) : 1;

  const trendData = {
    labels: trend.labels,
    datasets: [
      {
        label: isMonth ? t('chart.legendMonth') : t('chart.legendDay'),
        data: trend.values,
        borderColor: brand,
        backgroundColor: brand + (isMonth ? '33' : 'CC'),
        tension: 0.35,
        fill: isMonth,
        pointRadius: isMonth ? 3 : 0,
        pointHoverRadius: isMonth ? 5 : 3,
        pointBackgroundColor: brand,
        pointBorderColor: surface0,
        pointBorderWidth: 2,
        borderWidth: isMonth ? 2 : 0,
        borderRadius: 0,
        maxBarThickness: 28,
      },
    ],
  };

  // Doughnut 配色：brand 主色 + ink-cool ramp（6 色内，cool gray 谱内，符合 ≤3 active hues 精神）
  const pieData = {
    labels: splitData.map(([k]) => k),
    datasets: [
      {
        data: splitData.map(([, v]) => Number(v.toFixed(2))),
        backgroundColor: [brand, '#6B7280', '#9CA3AF', '#4B5563', '#374151', '#1F2937'],
        borderWidth: 0,
      },
    ],
  };

  const axisTicks = { color: ink500, font: { size: 11 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 12 };
  const tooltipBase = { backgroundColor: ink900, padding: 8, cornerRadius: 0, displayColors: false };
  const yAxis = {
    beginAtZero: true,
    grid: { color: surface3, drawTicks: false },
    border: { display: false },
    ticks: { color: ink500, font: { size: 11 }, padding: 8, callback: (v: unknown) => '¥' + v },
  };

  const segBtn = (on: boolean) =>
    `px-3 py-1 text-xs font-medium transition-colors ${
      on ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
    }`;

  return (
    <section className="mb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-[color:var(--surface-3)]">
        <div>
          <h3 className="text-base font-semibold text-ink-900">{t('chart.title')}</h3>
          <p className="text-xs text-ink-500 mt-0.5">{t('chart.subtitle')}</p>
        </div>
        <div className="inline-flex border border-[color:var(--surface-3)] self-start">
          {(['month', 'day'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={segBtn(mode === m)}>
              {m === 'month' ? t('chart.viewMonth') : t('chart.viewDay')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-5">
        {/* trend */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {isMonth ? t('chart.next12m') : t('chart.next30d')}
          </p>
          <div className="h-64">
            {isMonth ? (
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { ...tooltipBase, callbacks: { label: (c) => money(Number(c.parsed.y ?? 0)) } },
                  },
                  scales: {
                    x: { grid: { display: false }, border: { display: false }, ticks: axisTicks },
                    y: yAxis,
                  },
                }}
              />
            ) : (
              <Bar
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { ...tooltipBase, callbacks: { label: (c) => money(Number(c.parsed.y ?? 0)) } },
                  },
                  scales: {
                    x: { grid: { display: false }, border: { display: false }, ticks: axisTicks },
                    y: yAxis,
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* top 10 —— 纯文字 + tabular nums，无 Trophy 装饰 */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {t('chart.top10')} · {isMonth ? t('chart.next30d') : t('chart.today')}
          </p>
          {top10.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-400">{t('chart.noData')}</div>
          ) : (
            <ul className="space-y-0 divide-y divide-[color:var(--surface-3)]">
              {top10.map((it, i) => {
                const value = isMonth ? it.monthly : it.daily;
                const pct = topMax > 0 ? (value / topMax) * 100 : 0;
                return (
                  <li
                    key={`${it.name}-${i}`}
                    title={`${it.name}${it.end ? ` · ${it.end}` : ''}`}
                    className="relative flex items-center gap-3 px-1 py-2 overflow-hidden"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-brand-600/10"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <span className="relative w-5 text-xs num text-ink-400 text-right shrink-0">{i + 1}</span>
                    <span className="relative flex-1 min-w-0 text-sm text-ink-900 truncate">{it.name}</span>
                    <span className="relative text-sm num text-ink-900 shrink-0 font-medium">{money(value)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* split */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
              {(split === 'category' ? t('chart.byCategory') : t('chart.byItem')).replace(
                '{{span}}',
                isMonth ? t('chart.next30d') : t('chart.today'),
              )}
            </p>
            <div className="inline-flex border border-[color:var(--surface-3)] self-start">
              {(['category', 'item'] as SplitMode[]).map((s) => (
                <button key={s} onClick={() => setSplit(s)} className={segBtn(split === s)}>
                  {s === 'category' ? t('chart.splitCategory') : t('chart.splitItem')}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {splitData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-ink-400">{t('chart.noData')}</div>
            ) : (
              <Doughnut
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { color: ink700, font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 8 },
                    },
                    tooltip: {
                      backgroundColor: ink900,
                      padding: 8,
                      cornerRadius: 0,
                      callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` },
                    },
                  },
                  cutout: '58%',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}