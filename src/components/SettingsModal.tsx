import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Download,
  Upload,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  KeyRound,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Send,
  Sun,
  Moon,
  MonitorSmartphone,
} from 'lucide-react';
import Modal from './Modal';
import Checkbox from './Checkbox';
import { api, type WebhookTestResult } from '@/lib/api';
import type { ColorScheme } from '@/lib/types';
import { applyColorScheme, storage as themeStorage } from '@/lib/storage';

const WEBHOOK_URL_KEY = 'asset_tracker_webhook_url';
const WEBHOOK_ENABLED_KEY = 'asset_tracker_webhook_enabled';
const WEBHOOK_TOKEN_KEY = 'asset_tracker_webhook_token';

interface Props {
  open: boolean;
  onClose: () => void;
  onChangePassword: () => void;
  onSaveSetting?: (key: string, value: string) => Promise<void>;
  onGetSetting?: (key: string) => Promise<string | null>;
  onExportJson: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => void;
  usdRate: number;
  onSaveUsdRate: (rate: number) => Promise<void> | void;
}

type TestState = { state: 'idle' | 'loading' | 'ok' | 'fail'; detail?: string };

/** 把接收端的回执翻译成人话。
 *
 *  HTTP 200 不等于「通知真的发出去了」：蓝鸟这类网关在「来源收到但没绑通知渠道」时
 *  会回 200 + {"ignored": true}。只显示 200 会让人以为通了，其实什么也没发。
 */
function describeTestResult(r: WebhookTestResult, t: TFunction): TestState {
  if (!r.ok) return { state: 'fail', detail: r.error || `HTTP ${r.status}` };
  let verdict: Record<string, unknown> = {};
  try {
    verdict = JSON.parse(r.body || '{}') as Record<string, unknown>;
  } catch {
    // 接收端回的不是 JSON，只报状态码
  }
  if (verdict.ignored === true) return { state: 'fail', detail: `HTTP ${r.status} · ${t('settings.testIgnored')}` };
  if (verdict.pushed === true) return { state: 'ok', detail: `HTTP ${r.status} · ${t('settings.testPushed')}` };
  if (verdict.dup === true) return { state: 'ok', detail: `HTTP ${r.status} · ${t('settings.testDup')}` };
  return { state: 'ok', detail: `HTTP ${r.status}` };
}

/**
 * Industrial mono Settings modal:
 * - section 之间 hairline 分隔（不再是 nested rounded cards）
 * - input/button 全部 0 直角、ink-900 主提交按钮
 * - 砍掉原 5 主题切换（DESIGN.md §This design will NOT use 第 1 条）
 * - 新增「外观」三态 segmented control：浅色 / 深色 / 跟随系统
 */
export default function SettingsModal({
  open,
  onClose,
  onChangePassword,
  onSaveSetting,
  onGetSetting,
  onExportJson,
  onExportCsv,
  onImportFile,
  usdRate,
  onSaveUsdRate,
}: Props) {
  const { t } = useTranslation();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [test, setTest] = useState<TestState>({ state: 'idle' });
  const [saved, setSaved] = useState(false);
  const [rateInput, setRateInput] = useState(String(usdRate));
  const [scheme, setScheme] = useState<ColorScheme>(themeStorage.colorScheme);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRateInput(String(usdRate));
  }, [usdRate]);

  useEffect(() => {
    setScheme(themeStorage.colorScheme);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const get = async (k: string) => (onGetSetting ? await onGetSetting(k) : localStorage.getItem(k));
      setWebhookUrl((await get(WEBHOOK_URL_KEY)) || '');
      setWebhookToken((await get(WEBHOOK_TOKEN_KEY)) || '');
      setWebhookEnabled((await get(WEBHOOK_ENABLED_KEY)) === 'true');
      setTest({ state: 'idle' });
      setShowToken(false);
    })();
  }, [open, onGetSetting]);

  const persist = async (url: string, token: string, enabled: boolean) => {
    if (onSaveSetting) {
      await onSaveSetting(WEBHOOK_URL_KEY, url);
      await onSaveSetting(WEBHOOK_TOKEN_KEY, token);
      await onSaveSetting(WEBHOOK_ENABLED_KEY, String(enabled));
    } else {
      localStorage.setItem(WEBHOOK_URL_KEY, url);
      localStorage.setItem(WEBHOOK_TOKEN_KEY, token);
      localStorage.setItem(WEBHOOK_ENABLED_KEY, String(enabled));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runTest = async () => {
    if (!webhookUrl.trim()) return;
    setTest({ state: 'loading' });
    try {
      const r = await api.testWebhook(webhookUrl.trim(), webhookToken.trim());
      setTest(describeTestResult(r, t));
    } catch (e: unknown) {
      setTest({ state: 'fail', detail: String((e as Error)?.message || e).slice(0, 120) });
    }
    setTimeout(() => setTest({ state: 'idle' }), 6000);
  };

  const inputCls =
    'w-full border border-[color:var(--surface-3)] bg-surface-0 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-600 outline-none transition-colors';
  const rowCls = 'w-full text-left px-3 py-3 hover:bg-surface-1 transition-colors flex items-center gap-3';

  return (
    <Modal id="settings" open={open} onClose={onClose} title={t('settings.title')} maxWidth="max-w-lg">
      <div className="p-5 space-y-7">
        {/* ---- appearance (DESIGN.md §This design will NOT use 第 1 条：砍掉 5 主题) ---- */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {t('settings.appearance')}
          </h4>
          <div className="border border-[color:var(--surface-3)]">
            <div className="grid grid-cols-3">
              <SchemeBtn
                active={scheme === 'light'}
                icon={<Sun className="w-4 h-4" />}
                label={t('settings.schemeLight')}
                onClick={() => {
                  applyColorScheme('light');
                  setScheme('light');
                }}
              />
              <SchemeBtn
                active={scheme === 'dark'}
                icon={<Moon className="w-4 h-4" />}
                label={t('settings.schemeDark')}
                onClick={() => {
                  applyColorScheme('dark');
                  setScheme('dark');
                }}
              />
              <SchemeBtn
                active={scheme === 'system'}
                icon={<MonitorSmartphone className="w-4 h-4" />}
                label={t('settings.schemeSystem')}
                onClick={() => {
                  applyColorScheme('system');
                  setScheme('system');
                }}
              />
            </div>
          </div>
        </div>

        {/* ---- notifications ---- */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {t('settings.notif')}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/hooks/asset-tracker"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">{t('settings.webhookToken')}</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  placeholder={t('settings.webhookTokenPlaceholder')}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputCls} pr-10 font-mono`}
                />
                <button
                  type="button"
                  aria-label={showToken ? t('settings.hideToken') : t('settings.showToken')}
                  title={showToken ? t('settings.hideToken') : t('settings.showToken')}
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900 transition-colors"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-ink-500 mt-1">{t('settings.webhookTokenHint')}</p>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Checkbox
                checked={webhookEnabled}
                onChange={(v) => {
                  setWebhookEnabled(v);
                  persist(webhookUrl.trim(), webhookToken.trim(), v);
                }}
                label={t('settings.webhookEnabled')}
                ariaLabel="webhook-enabled"
              />
              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-ok">{t('settings.saved')}</span>}
                <button
                  type="button"
                  onClick={runTest}
                  disabled={!webhookUrl.trim() || test.state === 'loading'}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  {test.state === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : test.state === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                  ) : test.state === 'fail' ? (
                    <XCircle className="w-3.5 h-3.5 text-danger" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {t('settings.testWebhook')}
                </button>
              </div>
            </div>

            {test.state !== 'idle' && test.state !== 'loading' && test.detail && (
              <p className={`text-xs break-all ${test.state === 'ok' ? 'text-ok' : 'text-danger'}`}>
                {test.state === 'ok'
                  ? t('settings.testOk', { detail: test.detail })
                  : t('settings.testFail', { detail: test.detail })}
              </p>
            )}

            <button
              type="button"
              onClick={() => persist(webhookUrl.trim(), webhookToken.trim(), webhookEnabled)}
              className="w-full text-xs font-medium text-brand-600 hover:text-brand-700 border border-[color:var(--surface-3)] py-1.5 hover:bg-surface-1 transition-colors"
            >
              {t('action.save')}
            </button>
          </div>
        </div>

        {/* ---- data ---- */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {t('settings.data')}
          </h4>
          <div className="border border-[color:var(--surface-3)] mb-3 px-3 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{t('settings.usdRate')}</p>
              <p className="text-xs text-ink-500 mt-0.5">{t('settings.usdRateHint')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-ink-500">$1 = ¥</span>
              <input
                type="text"
                inputMode="decimal"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value.replace(/[^\d.]/g, ''))}
                onBlur={() => {
                  const v = Number(rateInput);
                  if (Number.isFinite(v) && v > 0) onSaveUsdRate(v);
                  else setRateInput(String(usdRate));
                }}
                className="w-16 border border-[color:var(--surface-3)] px-2 py-1 text-sm text-right bg-surface-0 text-ink-900 focus:border-brand-600 outline-none transition-colors num"
              />
            </div>
          </div>
          <div className="border border-[color:var(--surface-3)] divide-y divide-[color:var(--surface-3)]">
            <button onClick={onExportJson} className={rowCls}>
              <Download className="w-4 h-4 text-ink-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink-900">{t('action.exportJson')}</span>
                <span className="block text-xs text-ink-500 mt-0.5">{t('settings.exportJsonHint')}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />
            </button>
            <button onClick={onExportCsv} className={rowCls}>
              <FileSpreadsheet className="w-4 h-4 text-ink-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink-900">{t('action.exportCsv')}</span>
                <span className="block text-xs text-ink-500 mt-0.5">{t('settings.exportCsvHint')}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />
            </button>
            <button onClick={() => fileRef.current?.click()} className={rowCls}>
              <Upload className="w-4 h-4 text-ink-500 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink-900">{t('action.importJson')}</span>
                <span className="block text-xs text-ink-500 mt-0.5">{t('settings.importJsonHint')}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-400 shrink-0" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* ---- account ---- */}
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500 mb-3">
            {t('settings.account')}
          </h4>
          <div className="border border-[color:var(--surface-3)]">
            <button onClick={onChangePassword} className={`${rowCls}`}>
              <KeyRound className="w-4 h-4 text-ink-500" />
              <span className="text-sm font-medium text-ink-900 flex-1">{t('login.changeTitle')}</span>
              <ChevronRight className="w-4 h-4 text-ink-400" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface SchemeBtnProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SchemeBtn({ active, icon, label, onClick }: SchemeBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-3 flex items-center justify-center gap-2 transition-colors ${
        active ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-surface-1'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}