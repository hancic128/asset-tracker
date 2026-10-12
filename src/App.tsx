import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';

import Header from '@/components/Header';
import ReminderBanner from '@/components/ReminderBanner';
import StatCards from '@/components/StatCards';
import Charts from '@/components/Charts';
import SubscriptionTable from '@/components/SubscriptionTable';
import CardTable from '@/components/CardTable';
import Fab from '@/components/Fab';
import Toast from '@/components/Toast';
import SettingsModal from '@/components/SettingsModal';
import AddSubscriptionModal from '@/components/AddSubscriptionModal';
import AddCardModal from '@/components/AddCardModal';
import RenewSubscriptionModal, { type RenewPayload } from '@/components/RenewSubscriptionModal';
import ExtendCardModal from '@/components/ExtendCardModal';
import LoginPage from '@/components/LoginPage';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Footer from '@/components/Footer';

import { useAuth } from '@/hooks/useAuth';
import { useToasts } from '@/hooks/useToasts';
import { useData } from '@/hooks/useData';
import { initTheme } from '@/lib/storage';
import { computeStats, collectCategories } from '@/lib/utils';
import { collectReminders } from '@/lib/reminders';
import { exportJson, exportCsv, parseImportFile } from '@/lib/exportImport';
import type { Subscription, StoredValueCard, ThemeName, ColorScheme, Tab } from '@/lib/types';

export default function App() {
  const { i18n } = useTranslation();
  const auth = useAuth();
  const { toasts, show, dismiss } = useToasts();
  const data = useData(!auth.loading && auth.signedIn);

  const [theme, setTheme] = useState<ThemeName>('indigo');
  const [scheme, setScheme] = useState<ColorScheme>('light');
  const bumpPrefs = () => {
    setTheme((document.documentElement.getAttribute('data-theme') as ThemeName) || 'indigo');
    setScheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  };
  useEffect(() => {
    initTheme();
    bumpPrefs();
  }, []);

  const [tab, setTab] = useState<Tab>('subscriptions');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | undefined>(undefined);
  const [editCard, setEditCard] = useState<StoredValueCard | undefined>(undefined);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [renewState, setRenewState] = useState<Subscription | null>(null);
  const [extendState, setExtendState] = useState<StoredValueCard | null>(null);
  const [confirmState, setConfirmState] = useState<{
    kind: 'delete-sub' | 'delete-card' | 'end-sub' | 'end-card';
    item: Subscription | StoredValueCard;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (!auth.signedIn) return;
    data
      .getSetting('asset_tracker_webhook_url')
      .then((v) => setWebhookConfigured(!!v))
      .catch(() => {});
  }, [auth.signedIn, data.getSetting]);

  /** 续订：打开弹窗预填「新周期」，金额/周期可在其中调整（涨价一次到位）。
   *  新周期从旧 end_date + 1 天开始 —— 摊销窗口含首尾，若从旧的 end_date 开始会重叠计费一天。 */
  const onRenewSubscription = (s: Subscription) => setRenewState(s);

  /** 确认续订：新建一条 active 新周期，旧周期标记 renewed（离开 active，停止提醒与摊销）。 */
  const performRenew = async (s: Subscription, p: RenewPayload) => {
    if (s.id == null) return;
    try {
      const { id, created_at, ...rest } = s;
      await data.addSub({
        ...(rest as Subscription),
        amount: p.amount,
        period_preset: p.period_preset,
        period_days: p.period_days,
        start_date: p.start_date,
        end_date: p.end_date,
        status: 'active',
        remind_enabled: false,
        remind_date: null,
      });
      await data.updateSub(s.id, { ...s, status: 'renewed' });
      show('success', i18n.t('toast.renewed', { name: s.name, date: p.end_date }));
    } catch (e: unknown) {
      show('error', String((e as Error)?.message || e));
    }
  };

  const runConfirmed = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      const { kind, item } = confirmState;
      if (kind === 'delete-sub' && item.id != null) {
        await data.deleteSub(item.id);
        show('success', i18n.t('toast.deleted'));
      } else if (kind === 'delete-card' && item.id != null) {
        await data.deleteCard(item.id);
        show('success', i18n.t('toast.deleted'));
      } else if (kind === 'end-sub' && item.id != null) {
        await data.updateSub(item.id, { ...(item as Subscription), status: 'expired' });
        show('success', i18n.t('toast.ended', { name: item.name }));
      } else if (kind === 'end-card' && item.id != null) {
        await data.updateCard(item.id, { ...(item as StoredValueCard), status: 'expired' });
        show('success', i18n.t('toast.ended', { name: item.name }));
      }
      setConfirmState(null);
    } catch (e: unknown) {
      show('error', String((e as Error)?.message || e));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    await data.saveSetting(key, value);
    if (key === 'asset_tracker_webhook_url') setWebhookConfigured(!!value);
  };

  const handleExportJson = () => {
    const n = exportJson(data.subs, data.cards);
    show('success', i18n.t('toast.exported', { n }));
  };
  const handleExportCsv = () => {
    const n = exportCsv(data.subs, data.cards);
    show('success', i18n.t('toast.exported', { n }));
  };
  const handleImportFile = async (file: File) => {
    try {
      const { subscriptions, cards } = await parseImportFile(file);
      const n = subscriptions.length + cards.length;
      if (n === 0) {
        show('warn', i18n.t('toast.importEmpty'));
        return;
      }
      await data.bulkImport(subscriptions, cards);
      show('success', i18n.t('toast.imported', { n }));
    } catch (e: any) {
      const code = String(e?.message || '');
      show(
        'error',
        code === 'invalid_json' || code === 'invalid_shape'
          ? i18n.t('toast.importInvalid')
          : i18n.t('toast.importFailed'),
      );
    }
  };

  const stats = useMemo(() => computeStats(data.subs, data.cards, data.usdRate), [data.subs, data.cards, data.usdRate]);
  const categories = useMemo(
    () => collectCategories(data.storedCategories, data.subs, data.cards),
    [data.storedCategories, data.subs, data.cards],
  );
  // 铃铛与横幅共用同一份提醒结果，避免两处口径不一致
  const reminders = useMemo(() => collectReminders(data.subs, data.cards), [data.subs, data.cards]);

  const onSaveSubscription = async (s: Subscription) => {
    try {
      if (s.id) await data.updateSub(s.id, s);
      else await data.addSub(s);
      if (s.category?.trim()) await data.rememberCategory(s.category);
      show('success', i18n.t('toast.savedSub'));
    } catch (e: any) {
      show('error', String(e?.message || e));
    }
  };
  const onDeleteSubscription = (s: Subscription) => setConfirmState({ kind: 'delete-sub', item: s });
  const onEndSubscription = (s: Subscription) => setConfirmState({ kind: 'end-sub', item: s });
  const onSaveCard = async (c: StoredValueCard) => {
    try {
      if (c.id) await data.updateCard(c.id, c);
      else await data.addCard(c);
      if (c.category?.trim()) await data.rememberCategory(c.category);
      show('success', i18n.t('toast.savedCard'));
    } catch (e: any) {
      show('error', String(e?.message || e));
    }
  };
  const onDeleteCard = (c: StoredValueCard) => setConfirmState({ kind: 'delete-card', item: c });
  const onEndCard = (c: StoredValueCard) => setConfirmState({ kind: 'end-card', item: c });
  /** 延期：直接改 expires_at，卡里余额 / 余次不变。 */
  const onExtendCard = async (c: StoredValueCard, expiresAt: string) => {
    if (c.id == null) return;
    try {
      await data.updateCard(c.id, { ...c, expires_at: expiresAt });
      show('success', i18n.t('toast.extended', { name: c.name, date: expiresAt }));
    } catch (e: unknown) {
      show('error', String((e as Error)?.message || e));
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-2">
        <RefreshCw className="w-5 h-5 text-ink-400 animate-spin" />
      </div>
    );
  }
  if (!auth.signedIn) {
    return <LoginPage mode={auth.needsSetup ? 'setup' : 'login'} onSetup={auth.setupPassword} onSignIn={auth.signIn} />;
  }

  return (
    <>
      <div className="min-h-screen bg-surface-0 text-ink-900 transition-colors duration-fast ease-mechanical">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Header
            subs={data.subs}
            cards={data.cards}
            webhookConfigured={webhookConfigured}
            onSignOut={() => {
              auth.signOut();
              show('info', i18n.t('login.signedOut'));
            }}
            onRenewSub={onRenewSubscription}
            onEndSub={onEndSubscription}
            onExtendCard={setExtendState}
            onEndCard={onEndCard}
          />
          <ReminderBanner
            reminders={reminders}
            onRenewSub={onRenewSubscription}
            onEndSub={onEndSubscription}
            onExtendCard={setExtendState}
            onEndCard={onEndCard}
          />

          {data.error && (
            <div className="mb-6 border-l-2 border-danger bg-danger-soft px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-danger">
                <p className="font-medium">{i18n.t('errors.loadFailed')}</p>
                <button onClick={data.reload} className="text-xs mt-1 underline hover:no-underline">
                  {i18n.t('action.refresh')}
                </button>
              </div>
            </div>
          )}

          <StatCards stats={stats} />
          <Charts subs={data.subs} usdRate={data.usdRate} />

          <section>
            <div className="border-b border-[color:var(--surface-3)] flex items-center px-1 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setTab('subscriptions')}
                className={`px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'subscriptions' ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
              >
                {i18n.t('tab.subscriptions')} <span className="text-xs text-ink-400 ml-1">({data.subs.length})</span>
              </button>
              <button
                onClick={() => setTab('cards')}
                className={`px-4 sm:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'cards' ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-700'}`}
              >
                {i18n.t('tab.cards')} <span className="text-xs text-ink-400 ml-1">({data.cards.length})</span>
              </button>
              <div className="ml-auto p-2 flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditSub(undefined);
                    setAddSubOpen(true);
                  }}
                  className="bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-700 transition-colors flex items-center gap-2"
                  aria-label="add-subscription"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{i18n.t('add.subscription')}</span>
                </button>
                <button
                  onClick={() => {
                    setEditCard(undefined);
                    setAddCardOpen(true);
                  }}
                  className="bg-transparent border border-[color:var(--surface-3)] text-ink-700 text-sm font-medium px-4 py-2 hover:bg-surface-1 transition-colors flex items-center gap-2"
                  aria-label="add-card"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline">{i18n.t('add.card')}</span>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {data.loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-ink-400 animate-spin" />
                </div>
              ) : tab === 'subscriptions' ? (
                <SubscriptionTable
                  subs={data.subs}
                  search={search}
                  onSearch={setSearch}
                  filter={filter}
                  onFilter={setFilter}
                  filterCategory={filterCategory}
                  onFilterCategory={setFilterCategory}
                  categories={categories}
                  showExpired={showExpired}
                  onShowExpired={setShowExpired}
                  onEdit={(s) => {
                    setEditSub(s);
                    setAddSubOpen(true);
                  }}
                  onDelete={onDeleteSubscription}
                  onRenew={onRenewSubscription}
                  onEnd={onEndSubscription}
                />
              ) : (
                <CardTable
                  cards={data.cards}
                  search={search}
                  onSearch={setSearch}
                  filter={filter}
                  onFilter={setFilter}
                  filterCategory={filterCategory}
                  onFilterCategory={setFilterCategory}
                  categories={categories}
                  showExpired={showExpired}
                  onShowExpired={setShowExpired}
                  onEdit={(c) => {
                    setEditCard(c);
                    setAddCardOpen(true);
                  }}
                  onDelete={onDeleteCard}
                  onExtend={setExtendState}
                  onEnd={onEndCard}
                />
              )}
            </div>
          </section>

          <Footer />
        </div>
      </div>

      <Fab theme={theme} scheme={scheme} onChange={bumpPrefs} onOpenSettings={() => setSettingsOpen(true)} />
      <Toast toasts={toasts} onDismiss={dismiss} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChangePassword={() => {
          setSettingsOpen(false);
          setChangePwOpen(true);
        }}
        onSaveSetting={handleSaveSetting}
        onGetSetting={data.getSetting}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        usdRate={data.usdRate}
        onSaveUsdRate={data.saveUsdRate}
      />
      <AddSubscriptionModal
        open={addSubOpen}
        onClose={() => {
          setAddSubOpen(false);
          setEditSub(undefined);
        }}
        onSave={onSaveSubscription}
        initial={editSub}
        categories={categories}
        onDeleteCategory={data.deleteCategory}
      />
      <AddCardModal
        open={addCardOpen}
        onClose={() => {
          setAddCardOpen(false);
          setEditCard(undefined);
        }}
        onSave={onSaveCard}
        initial={editCard}
        categories={categories}
        onDeleteCategory={data.deleteCategory}
      />
      <RenewSubscriptionModal
        open={!!renewState}
        sub={renewState ?? undefined}
        onClose={() => setRenewState(null)}
        onConfirm={(p) => {
          if (renewState) performRenew(renewState, p);
          setRenewState(null);
        }}
      />
      <ExtendCardModal
        open={!!extendState}
        card={extendState ?? undefined}
        onClose={() => setExtendState(null)}
        onConfirm={(d) => {
          if (extendState) onExtendCard(extendState, d);
          setExtendState(null);
        }}
      />
      <ConfirmDialog
        open={!!confirmState}
        danger
        busy={confirmBusy}
        title={
          confirmState?.kind === 'end-sub' || confirmState?.kind === 'end-card'
            ? i18n.t('confirm.endTitle', { name: confirmState.item.name })
            : i18n.t('confirm.deleteTitle', { name: confirmState?.item?.name ?? '' })
        }
        message={
          confirmState?.kind === 'end-sub' || confirmState?.kind === 'end-card'
            ? i18n.t('confirm.endMsg')
            : i18n.t('confirm.deleteMsg')
        }
        confirmLabel={
          confirmState?.kind === 'end-sub' || confirmState?.kind === 'end-card'
            ? i18n.t('action.end')
            : i18n.t('table.delete')
        }
        onConfirm={runConfirmed}
        onCancel={() => setConfirmState(null)}
      />

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} onChange={auth.changePassword} />
    </>
  );
}
