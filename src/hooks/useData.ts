import { useState, useEffect, useCallback } from 'react';
import type { Subscription, StoredValueCard } from '@/lib/types';
import { api, type SubscriptionRow, type CardRow } from '@/lib/api';

export const CATEGORY_KEY = 'asset_tracker_categories';
export const USD_RATE_KEY = 'asset_tracker_usd_rate';

/** 只提交后端认识的列；id / created_at 由服务端管。 */
const subPayload = (s: Subscription): Record<string, unknown> => ({
  name: s.name,
  amount: s.amount,
  currency: s.currency ?? 'CNY',
  period_preset: s.period_preset ?? 'month',
  period_days: s.period_days,
  start_date: s.start_date || null,
  end_date: s.end_date || null,
  category: s.category || null,
  status: s.status,
  remind_enabled: !!s.remind_enabled,
  remind_date: s.remind_enabled ? s.remind_date || null : null,
  notes: s.notes || null,
});

const cardPayload = (c: StoredValueCard): Record<string, unknown> => ({
  name: c.name,
  type: c.type,
  category: c.category || null,
  currency: c.currency ?? 'CNY',
  initial_amount: c.initial_amount,
  remaining_amount: c.remaining_amount,
  initial_uses: c.initial_uses,
  remaining_uses: c.remaining_uses,
  expires_at: c.expires_at || null,
  status: c.status,
  remind_enabled: !!c.remind_enabled,
  remind_date: c.remind_enabled ? c.remind_date || null : null,
  notes: c.notes || null,
});

function toSub(r: SubscriptionRow): Subscription {
  return {
    ...r,
    amount: Number(r.amount ?? 0),
    period_days: Number(r.period_days ?? 30),
    remind_enabled: !!r.remind_enabled,
  };
}
function toCard(r: CardRow): StoredValueCard {
  return {
    ...r,
    initial_amount: Number(r.initial_amount ?? 0),
    remaining_amount: Number(r.remaining_amount ?? 0),
    initial_uses: Number(r.initial_uses ?? 0),
    remaining_uses: Number(r.remaining_uses ?? 0),
    remind_enabled: !!r.remind_enabled,
  };
}

export function useData(enabled: boolean) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [cards, setCards] = useState<StoredValueCard[]>([]);
  const [storedCategories, setStoredCategories] = useState<string[]>([]);
  const [usdRate, setUsdRate] = useState(7.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rawSubs, rawCards, settings] = await Promise.all([api.subscriptions(), api.cards(), api.settings()]);
      setSubs(rawSubs.map(toSub));
      setCards(rawCards.map(toCard));
      try {
        const list = JSON.parse(settings[CATEGORY_KEY] || '[]');
        setStoredCategories(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
      } catch {
        setStoredCategories([]);
      }
      const rate = Number(settings[USD_RATE_KEY]);
      setUsdRate(Number.isFinite(rate) && rate > 0 ? rate : 7.2);
    } catch (e: unknown) {
      setError(String((e as Error)?.message || e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // 挂载时载一次，登录后 enabled 变化会再载一次
  useEffect(() => {
    load();
  }, [load]);

  const addSub = useCallback(
    async (s: Subscription) => {
      await api.createSubscription(subPayload(s));
      await load();
    },
    [load],
  );

  const updateSub = useCallback(
    async (id: number, s: Subscription) => {
      await api.updateSubscription(id, subPayload(s));
      await load();
    },
    [load],
  );

  const deleteSub = useCallback(
    async (id: number) => {
      await api.deleteSubscription(id);
      await load();
    },
    [load],
  );

  const addCard = useCallback(
    async (c: StoredValueCard) => {
      await api.createCard(cardPayload(c));
      await load();
    },
    [load],
  );

  const updateCard = useCallback(
    async (id: number, c: StoredValueCard) => {
      await api.updateCard(id, cardPayload(c));
      await load();
    },
    [load],
  );

  const deleteCard = useCallback(
    async (id: number) => {
      await api.deleteCard(id);
      await load();
    },
    [load],
  );

  const saveSetting = useCallback(async (key: string, value: string) => {
    await api.putSetting(key, value);
  }, []);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    const s = await api.settings();
    return s[key] ?? null;
  }, []);

  const rememberCategory = useCallback(
    async (name: string) => {
      const v = name.trim();
      if (!v) return;
      const next = [...new Set([...storedCategories, v])].sort((a, b) => a.localeCompare(b, 'zh-CN'));
      setStoredCategories(next);
      await saveSetting(CATEGORY_KEY, JSON.stringify(next));
    },
    [storedCategories, saveSetting],
  );

  const deleteCategory = useCallback(
    async (name: string) => {
      for (const s of subs.filter((x) => x.category === name)) {
        if (s.id != null) await api.updateSubscription(s.id, { category: null });
      }
      for (const c of cards.filter((x) => x.category === name)) {
        if (c.id != null) await api.updateCard(c.id, { category: null });
      }
      const next = storedCategories.filter((c) => c !== name);
      setStoredCategories(next);
      await saveSetting(CATEGORY_KEY, JSON.stringify(next));
      await load();
    },
    [subs, cards, storedCategories, saveSetting, load],
  );

  const saveUsdRate = useCallback(
    async (rate: number) => {
      setUsdRate(rate);
      await saveSetting(USD_RATE_KEY, String(rate));
    },
    [saveSetting],
  );

  const bulkImport = useCallback(
    async (subsIn: Subscription[], cardsIn: StoredValueCard[]) => {
      await api.importAll({
        subscriptions: subsIn.map(subPayload),
        cards: cardsIn.map(cardPayload),
      });
      await load();
    },
    [load],
  );

  return {
    subs,
    cards,
    storedCategories,
    usdRate,
    loading,
    error,
    reload: load,
    addSub,
    updateSub,
    deleteSub,
    addCard,
    updateCard,
    deleteCard,
    saveSetting,
    getSetting,
    rememberCategory,
    deleteCategory,
    saveUsdRate,
    bulkImport,
  };
}
