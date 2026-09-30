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
  /** 用户手填的续费提醒：remind_date 已到或已过，且没被上面两类覆盖 */
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
  for (const s of activeSubs) {
    const d = daysUntil(s.end_date);
    if (d !== null && d >= 0 && d <= DUE_WINDOW_DAYS) dueSubs.push({ item: s, days: d });
  }
  dueSubs.sort((a, b) => a.days - b.days);

  const expiringCards: ReminderItem<StoredValueCard>[] = [];
  for (const c of activeCards) {
    const d = daysUntil(c.expires_at);
    if (d !== null && d >= 0 && d <= CARD_WINDOW_DAYS) expiringCards.push({ item: c, days: d });
  }
  expiringCards.sort((a, b) => a.days - b.days);

  // 已被上面两类覆盖的项不再进自设提醒，否则同一条会同时挂在两个分组下。
  const coveredSubs = new Set(dueSubs.map((r) => r.item.id));
  const coveredCards = new Set(expiringCards.map((r) => r.item.id));

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
    remindSubs,
    remindCards,
    count: dueSubs.length + expiringCards.length + remindSubs.length + remindCards.length,
  };
}
