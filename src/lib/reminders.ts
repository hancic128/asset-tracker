import type { Subscription, StoredValueCard } from './types';
import { parseISO, TODAY } from './utils';

/** 提醒口径的唯一来源。
 *
 *  以前页面内（铃铛 / 横幅 / 卡片角标）和每日 webhook 摘要各写一套判据，四处不一致：
 *    - 页面内自设提醒窗是 [−30, +30]，摘要里是 [0, +7]
 *    - 卡片过期用的 isNearExpiry 只有上界没有下界，早就过期的卡也算「30 天内过期」
 *    - 摘要会把已被「待扣费 / 卡将过期」覆盖的项从自设提醒里剔掉，页面内不剔，同一条出现两次
 *  这里收敛成一套，server.py 的 build_digest 必须跟这里保持一致（改动时两边一起改）。
 */

/** 订阅「待扣费」窗口：今天起 7 天内 */
export const DUE_WINDOW_DAYS = 7;
/** 储值卡「将过期」窗口：今天起 30 天内 */
export const CARD_WINDOW_DAYS = 30;

export interface ReminderItem<T> {
  item: T;
  /** 距今天数。0 = 今天，负数 = 已过 */
  days: number;
}

export interface Reminders {
  /** 订阅：end_date 落在 [今天, 今天+7] */
  dueSubs: ReminderItem<Subscription>[];
  /** 储值卡：expires_at 落在 [今天, 今天+30] */
  expiringCards: ReminderItem<StoredValueCard>[];
  /** 已到期未处理：active 但 end_date 已过（待续订 / 结束） */
  overdueSubs: ReminderItem<Subscription>[];
  /** 已到期未处理：active 但 expires_at 已过（待延期 / 结束） */
  overdueCards: ReminderItem<StoredValueCard>[];
  /** 用户手填的续费提醒：remind_date 已到或已过，且没被上面三类覆盖 */
  remindSubs: ReminderItem<Subscription>[];
  remindCards: ReminderItem<StoredValueCard>[];
  /** 铃铛角标用的总数 */
  count: number;
}

function startOfToday(): Date {
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
}

export function daysUntil(iso?: string | null): number | null {
  const d = parseISO(iso);
  if (!d) return null;
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000);
}

/** 自设提醒的触发口径：remind_date 已到或已过。
 *
 *  不设上界（提前提醒是「到点才响」），也不设下界——续订会把旧周期的 status 改成 renewed，
 *  该项随即离开 active，因此不会无限期地响下去；取消/用过期的同理。
 *  这条与 server.py 的 build_digest 必须一致。
 */
function reminderFired(s: { remind_enabled?: boolean; remind_date?: string | null }): number | null {
  if (!s.remind_enabled || !s.remind_date) return null;
  const d = daysUntil(s.remind_date);
  return d !== null && d <= 0 ? d : null;
}

export function collectReminders(subs: Subscription[], cards: StoredValueCard[]): Reminders {
  const activeSubs = subs.filter((s) => s.status === 'active');
  const activeCards = cards.filter((c) => c.status === 'active');

  const dueSubs: ReminderItem<Subscription>[] = [];
  /** 已到期未处理（active 且日期已过）：d >= 0 的待扣费/将过期不算，二者互补 */
  const overdueSubs: ReminderItem<Subscription>[] = [];
  for (const s of activeSubs) {
    const d = daysUntil(s.end_date);
    if (d === null) continue;
    if (d >= 0 && d <= DUE_WINDOW_DAYS) dueSubs.push({ item: s, days: d });
    else if (d < 0) overdueSubs.push({ item: s, days: d });
  }
  dueSubs.sort((a, b) => a.days - b.days);
  overdueSubs.sort((a, b) => a.days - b.days); // 最久过期的排最前

  const expiringCards: ReminderItem<StoredValueCard>[] = [];
  const overdueCards: ReminderItem<StoredValueCard>[] = [];
  for (const c of activeCards) {
    const d = daysUntil(c.expires_at);
    if (d === null) continue;
    if (d >= 0 && d <= CARD_WINDOW_DAYS) expiringCards.push({ item: c, days: d });
    else if (d < 0) overdueCards.push({ item: c, days: d });
  }
  expiringCards.sort((a, b) => a.days - b.days);
  overdueCards.sort((a, b) => a.days - b.days);

  // 已被上面几类覆盖的项不再进自设提醒，否则同一条会同时挂在两个分组下。
  const coveredSubs = new Set([...dueSubs, ...overdueSubs].map((r) => r.item.id));
  const coveredCards = new Set([...expiringCards, ...overdueCards].map((r) => r.item.id));

  const remindSubs: ReminderItem<Subscription>[] = [];
  for (const s of activeSubs) {
    if (coveredSubs.has(s.id)) continue;
    const d = reminderFired(s);
    if (d !== null) remindSubs.push({ item: s, days: d });
  }
  remindSubs.sort((a, b) => a.days - b.days);

  const remindCards: ReminderItem<StoredValueCard>[] = [];
  for (const c of activeCards) {
    if (coveredCards.has(c.id)) continue;
    const d = reminderFired(c);
    if (d !== null) remindCards.push({ item: c, days: d });
  }
  remindCards.sort((a, b) => a.days - b.days);

  return {
    dueSubs,
    expiringCards,
    overdueSubs,
    overdueCards,
    remindSubs,
    remindCards,
    count:
      dueSubs.length +
      expiringCards.length +
      overdueSubs.length +
      overdueCards.length +
      remindSubs.length +
      remindCards.length,
  };
}
