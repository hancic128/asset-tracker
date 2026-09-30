import type { Subscription, StoredValueCard, Stats, PeriodPreset, Currency } from './types';

export const TODAY = new Date();

export const PERIOD_PRESETS: PeriodPreset[] = ['week', 'month', 'quarter', 'half', 'year'];
export const PERIOD_DAYS: Record<PeriodPreset, number> = {
  week: 7,
  month: 30,
  quarter: 91,
  half: 182,
  year: 365,
  custom: 0, // arbitrary range — the actual span comes from start/end dates
};

export const CURRENCIES: Currency[] = ['CNY', 'USD'];
export const CURRENCY_SYMBOL: Record<Currency, string> = { CNY: '¥', USD: '$' };

export function currencySymbol(c?: string | null): string {
  return CURRENCY_SYMBOL[(c as Currency) ?? 'CNY'] ?? '¥';
}

/** Amount expressed in CNY, using the user's USD rate. */
export function toCNY(amount: number, currency: string | null | undefined, usdRate: number): number {
  return currency === 'USD' ? amount * usdRate : amount;
}

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s).replace(
    /[<>&"']/g,
    (c) => ({ '<': '<', '>': '>', '&': '&', '"': '"', "'": '&#39;' })[c]!,
  );
}

export function statusLabel(s: string, t: (k: string) => string): string {
  return (
    (
      {
        active: t('status.active'),
        paused: t('status.paused'),
        cancelled: t('status.cancelled'),
        depleted: t('status.depleted'),
        expired: t('status.expired'),
      } as Record<string, string>
    )[s] || s
  );
}

export function statusClass(s: string): string {
  return (
    (
      {
        active: 'bg-emerald-50 text-emerald-700',
        paused: 'bg-amber-50 text-amber-700',
        cancelled: 'bg-surface-2 text-ink-500',
        depleted: 'bg-rose-50 text-rose-700',
        expired: 'bg-rose-50 text-rose-700',
      } as Record<string, string>
    )[s] || 'bg-surface-2 text-ink-500'
  );
}

export function typeLabel(type: string, t: (k: string) => string): string {
  return (
    (
      {
        amount: t('card.type.amount'),
        count: t('card.type.count'),
      } as Record<string, string>
    )[type] || type
  );
}

export function periodLabel(preset: string, t: (k: string) => string): string {
  return (
    (
      {
        week: t('period.week'),
        month: t('period.month'),
        quarter: t('period.quarter'),
        half: t('period.half'),
        year: t('period.year'),
        custom: t('period.custom'),
      } as Record<string, string>
    )[preset] || preset
  );
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ---- date arithmetic on plain YYYY-MM-DD strings ----

export function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function toISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export function daysBetween(from: string, to: string): number {
  const a = parseISO(from),
    b = parseISO(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Cycle length used for amortisation: the real start→end span when known. */
export function effectivePeriodDays(s: Subscription): number {
  if (s.start_date && s.end_date) {
    const n = daysBetween(s.start_date, s.end_date);
    if (n > 0) return n;
  }
  return Math.max(1, Number(s.period_days) || PERIOD_DAYS[s.period_preset as PeriodPreset] || 30);
}

// ---- 摊销：只在订阅自己的有效期内按日分摊 ----

/** 含首尾的间隔天数：09-30 → 10-01 是 2 天。 */
export function daysInclusive(from: string, to: string): number {
  const a = parseISO(from),
    b = parseISO(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export interface ValiditySpan {
  /** 有效期起点（ISO，含） */
  start: string;
  /** 有效期终点（ISO，含） */
  end: string;
  /** 窗口天数（含首尾） */
  days: number;
}

/** 订阅的有效期窗口 —— 「这笔钱覆盖哪些日子」。
 *
 *  与 effectivePeriodDays 的区别：那个算的是「续订要往后推几天」，区间长度不含终点；
 *  这个算的是钱覆盖的实际日子，含首尾，好让整段窗口的日成本累加正好等于金额。
 *
 *  有 start_date 就用它；没有就按 period_days 从 end_date 往前推（保证窗口 = period_days 天）。
 *  没有 end_date 就无从定义有效期 —— 返回 null，该订阅不参与任何摊销（表单要求必填，正常数据都有）。
 */
export function validitySpan(s: {
  start_date?: string | null;
  end_date?: string | null;
  period_days?: number | string | null;
  period_preset?: string | null;
}): ValiditySpan | null {
  const end = s.end_date;
  if (!end) return null;
  const period = Math.max(1, Number(s.period_days) || PERIOD_DAYS[s.period_preset as PeriodPreset] || 30);
  const start = s.start_date || addDays(end, -(period - 1));
  return { start, end, days: Math.max(1, daysInclusive(start, end)) };
}

/** [from, to] 与有效期窗口的重叠天数（含首尾）。完全在窗口外就是 0。 */
export function overlapDays(span: ValiditySpan, from: string, to: string): number {
  const a = from > span.start ? from : span.start;
  const b = to < span.end ? to : span.end;
  if (a > b) return 0;
  return daysInclusive(a, b);
}

/** 订阅在 [from, to] 这段时间里摊到的钱：金额 / 有效期天数 × 重叠天数。
 *
 *  窗口外的日子一律为 0 —— 订阅结束后不再继续计费，未开始的日子也不算。
 *  ISO 日期串的字典序等同时间序，所以这里的字符串比较是安全的。
 */
export function amortisedAmount(
  s: {
    start_date?: string | null;
    end_date?: string | null;
    period_days?: number | string | null;
    period_preset?: string | null;
  },
  amountCNY: number,
  from: string,
  to: string,
): number {
  const span = validitySpan(s);
  if (!span) return 0;
  const overlap = overlapDays(span, from, to);
  if (overlap <= 0) return 0;
  return (amountCNY / span.days) * overlap;
}

export function isExpiringSoon(iso?: string | null): boolean {
  if (!iso) return false;
  const d = parseISO(iso);
  if (!d) return false;
  const today = new Date(TODAY.toDateString());
  return d >= today && d <= new Date(TODAY.getTime() + 7 * 86400000);
}

/** Finished for good: the cycle ended, or the row was cancelled / renewed. */
export function isExpiredSub(s: { status: string; end_date?: string | null }): boolean {
  if (s.status === 'cancelled' || s.status === 'renewed' || s.status === 'expired') return true;
  const d = parseISO(s.end_date);
  if (!d) return false;
  return d < new Date(TODAY.toDateString());
}

/** Finished for good: the card was used up / expired, or its expiry date passed. */
export function isExpiredCard(c: { status: string; expires_at?: string | null }): boolean {
  if (c.status === 'depleted' || c.status === 'expired') return true;
  const d = parseISO(c.expires_at);
  if (!d) return false;
  return d < new Date(TODAY.toDateString());
}

/** 储值卡「临近过期」：距今天 0–30 天内。
 *
 *  以前只有上界没有下界（`d < today+30`），早就过期的卡也会被打上「临近过期」角标、
 *  出现在铃铛的「30 天内过期」里，而每日 webhook 摘要用的却是 [0, 30]——同一个概念两套结果。
 *  现在与 src/lib/reminders.ts / server.py 的 build_digest 对齐：过期的归 isExpiredCard 管。
 */
export function isNearExpiry(iso?: string | null): boolean {
  if (!iso) return false;
  const d = parseISO(iso);
  if (!d) return false;
  const today = new Date(TODAY.toDateString());
  return d >= today && d <= new Date(TODAY.getTime() + 30 * 86400000);
}

export function computeStats(subs: Subscription[], cards: StoredValueCard[], usdRate = 7.2): Stats {
  const active = subs.filter((s) => s.status === 'active');
  const today = toISO(TODAY);
  const in30 = addDays(today, 29);
  // 只在各自有效期内按日摊 —— 有效期已过的订阅不再计入，还没开始的也不算
  const cny = (s: Subscription) => toCNY(Number(s.amount), s.currency, usdRate);
  const daily = active.reduce((sum, s) => sum + amortisedAmount(s, cny(s), today, today), 0);
  const monthly = active.reduce((sum, s) => sum + amortisedAmount(s, cny(s), today, in30), 0);
  const expiring = active.filter((s) => isExpiringSoon(s.end_date));
  const expiringAmount = expiring.reduce((sum, s) => sum + cny(s), 0);
  const activeCards = cards.filter((c) => c.status === 'active');
  const balance = activeCards.reduce((sum, c) => sum + toCNY(Number(c.remaining_amount || 0), c.currency, usdRate), 0);
  const totalUses = activeCards.reduce((sum, c) => sum + Number(c.remaining_uses || 0), 0);
  return {
    daily,
    monthly,
    expiring: expiring.length,
    expiringAmount,
    balance,
    totalUses,
    cardCount: activeCards.length,
  };
}

export function getSortedFiltered<T extends Record<string, any>>(
  list: T[],
  sortKey: keyof T,
  sortDir: 'asc' | 'desc',
  search: string,
  filterStatus: string,
  searchFields: (keyof T)[],
  filterCategory = 'all',
): T[] {
  let filtered = list;
  const q = search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((it) =>
      searchFields.some((f) =>
        String(it[f] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }
  if (filterStatus && filterStatus !== 'all') {
    filtered = filtered.filter((it) => it.status === filterStatus);
  }
  if (filterCategory && filterCategory !== 'all') {
    filtered = filtered.filter((it) => (it as Record<string, unknown>).category === filterCategory);
  }
  return filtered.slice().sort((a, b) => {
    const va = a[sortKey],
      vb = b[sortKey];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number')
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

export function paginate<T>(list: T[], page: number, pageSize: number) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), totalPages);
  const start = (cur - 1) * pageSize;
  return { slice: list.slice(start, start + pageSize), total, totalPages, page: cur };
}

/** Union of the stored category list and every category actually in use. */
export function collectCategories(stored: string[], subs: Subscription[], cards: StoredValueCard[]): string[] {
  const set = new Set<string>();
  for (const c of stored) if (c?.trim()) set.add(c.trim());
  for (const s of subs) if (s.category?.trim()) set.add(s.category.trim());
  for (const c of cards) if (c.category?.trim()) set.add(c.category.trim());
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
