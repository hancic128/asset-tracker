export type Status = 'active' | 'paused' | 'cancelled' | 'renewed' | 'depleted' | 'expired';
export type CardType = 'amount' | 'count';
export type PeriodPreset = 'week' | 'month' | 'quarter' | 'half' | 'year' | 'custom';
export type Currency = 'CNY' | 'USD';
export type ThemeName = 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
export type ColorScheme = 'light' | 'dark';
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
