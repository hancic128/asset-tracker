export type Status = 'active' | 'paused' | 'cancelled' | 'renewed' | 'depleted' | 'expired';
export type CardType = 'amount' | 'count';
export type PeriodPreset = 'week' | 'month' | 'quarter' | 'half' | 'year' | 'custom';
export type Currency = 'CNY' | 'USD';

/**
 * ThemeName 保留类型以避免破坏其他模块的引用，但实际**只取 'indigo'**。
 * 砍掉了 5 主题切换（DESIGN.md §This design will NOT use 第 1 条）。
 * 如果未来重新引入多主题，可以基于此 union 扩展。
 */
export type ThemeName = 'indigo';

/**
 * 外观模式：浅色 / 深色 / 跟随系统。
 * 与 DESIGN.md §This design will NOT use 第 1 条对齐。
 */
export type ColorScheme = 'light' | 'dark' | 'system';

export type Tab = 'subscriptions' | 'cards';

export interface Subscription {
  id?: number;
  name: string;
  amount: number;
  currency: Currency;
  period_preset: PeriodPreset;
  period_days: number;
  /** cycle start; end_date is derived from it unless overridden */
  start_date?: string | null;
  /** cycle end / next renewal */
  end_date?: string | null;
  category?: string | null;
  status: Status;
  remind_enabled?: boolean;
  remind_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface StoredValueCard {
  id?: number;
  name: string;
  type: CardType;
  category?: string | null;
  currency: Currency;
  initial_amount: number;
  remaining_amount: number;
  initial_uses: number;
  remaining_uses: number;
  expires_at?: string | null;
  status: Status;
  remind_enabled?: boolean;
  remind_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Stats {
  daily: number;
  monthly: number;
  expiring: number;
  expiringAmount: number;
  balance: number;
  totalUses: number;
  cardCount: number;
}

export interface ToastItem {
  id: number;
  level: 'success' | 'error' | 'warn' | 'info';
  message: string;
}