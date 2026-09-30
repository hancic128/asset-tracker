/** 同源 REST 客户端：前端与后端同一个域名，因此没有 CORS。
 *  会话令牌放在 localStorage，随每个请求带 Authorization: Bearer。 */

const TOKEN_KEY = 'asset_tracker_token';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 隐私模式下会话不持久，但本次仍可用 */
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error || `http_${res.status}`;
    throw new ApiError(res.status, code);
  }
  return data as T;
}

// ------------------------------------------------------------------ shapes

import type { Currency, PeriodPreset, Status, CardType } from './types';

export interface SubscriptionRow {
  id: number;
  name: string;
  amount: number;
  currency: Currency;
  period_preset: PeriodPreset;
  period_days: number;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  status: Status;
  remind_enabled: boolean;
  remind_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface CardRow {
  id: number;
  name: string;
  type: CardType;
  category: string | null;
  currency: Currency;
  initial_amount: number;
  remaining_amount: number;
  initial_uses: number;
  remaining_uses: number;
  expires_at: string | null;
  status: Status;
  remind_enabled: boolean;
  remind_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface SessionInfo {
  initialized: boolean;
  authenticated: boolean;
}

export interface WebhookTestResult {
  ok: boolean;
  status: number;
  /** 接收端的原始回执（服务端截断到 300 字符），用于判断它到底投递了没有 */
  body?: string;
  error?: string;
}

export interface BuildInfo {
  ok: boolean;
  version: string;
  /** 容器进程启动时间（UTC ISO），即本次部署的「上线时间」 */
  deployedAt: string;
}

// ------------------------------------------------------------------ calls

export const api = {
  session: () => request<SessionInfo>('GET', '/api/session'),
  buildInfo: () => request<BuildInfo>('GET', '/health'),

  login: async (password: string) => {
    const r = await request<{ token: string }>('POST', '/api/login', { password });
    setToken(r.token);
    return r;
  },

  setup: async (password: string) => {
    const r = await request<{ token: string }>('POST', '/api/setup', { password });
    setToken(r.token);
    return r;
  },

  logout: async () => {
    try {
      await request('POST', '/api/logout');
    } finally {
      setToken(null);
    }
  },

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('POST', '/api/password', { oldPassword, newPassword }),

  subscriptions: () => request<SubscriptionRow[]>('GET', '/api/subscriptions'),
  createSubscription: (data: Record<string, unknown>) => request<SubscriptionRow>('POST', '/api/subscriptions', data),
  updateSubscription: (id: number, data: Record<string, unknown>) =>
    request<SubscriptionRow>('PATCH', `/api/subscriptions/${id}`, data),
  deleteSubscription: (id: number) => request<{ deleted: number }>('DELETE', `/api/subscriptions/${id}`),

  cards: () => request<CardRow[]>('GET', '/api/cards'),
  createCard: (data: Record<string, unknown>) => request<CardRow>('POST', '/api/cards', data),
  updateCard: (id: number, data: Record<string, unknown>) => request<CardRow>('PATCH', `/api/cards/${id}`, data),
  deleteCard: (id: number) => request<{ deleted: number }>('DELETE', `/api/cards/${id}`),

  settings: () => request<Record<string, string>>('GET', '/api/settings'),
  putSetting: (key: string, value: string) =>
    request<{ ok: boolean }>('PUT', `/api/settings/${encodeURIComponent(key)}`, { value }),

  importAll: (data: { subscriptions: unknown[]; cards: unknown[] }) =>
    request<{ ok: boolean; imported: number }>('POST', '/api/import', data),

  testWebhook: (url: string, token: string) => request<WebhookTestResult>('POST', '/api/webhook/test', { url, token }),

  runWebhook: () => request<Record<string, unknown>>('POST', '/api/webhook/run'),
};
