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
} from 'lucide-react';
import Modal from './Modal';
import Checkbox from './Checkbox';
import { api, type WebhookTestResult } from '@/lib/api';

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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRateInput(String(usdRate));
  }, [usdRate]);

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

  const rowCls = 'w-full text-left px-3 py-3 hover:bg-surface-2 transition-colors flex items-center gap-3';
  const inputCls =
    'w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors';

  return (
    <Modal id="settings" open={open} onClose={onClose} title={t('settings.title')} maxWidth="max-w-lg">
      <div className="p-5 space-y-6">
        {/* ---- notifications ---- */}
        <div>
          <h4 className="text-sm font-semibold text-ink-900 mb-3">{t('settings.notif')}</h4>
          <div className="bg-surface-1 rounded-lg p-3 space-y-3">
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
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
                {saved && <span className="text-xs text-emerald-600">{t('settings.saved')}</span>}
                <button
                  type="button"
                  onClick={runTest}
                  disabled={!webhookUrl.trim() || test.state === 'loading'}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  {test.state === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : test.state === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : test.state === 'fail' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {t('settings.testWebhook')}
                </button>
              </div>
            </div>

            {test.state !== 'idle' && test.state !== 'loading' && test.detail && (
              <p className={`text-xs break-all ${test.state === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {test.state === 'ok'
                  ? t('settings.testOk', { detail: test.detail })
                  : t('settings.testFail', { detail: test.detail })}
              </p>
            )}

            <button
              type="button"
              onClick={() => persist(webhookUrl.trim(), webhookToken.trim(), webhookEnabled)}
              className="w-full text-xs font-medium text-brand-600 hover:text-brand-700 border border-surface-3 rounded-lg py-1.5 hover:bg-surface-2 transition-colors"
            >
              {t('action.save')}
            </button>
          </div>
        </div>

        {/* ---- data ---- */}
        <div>
          <h4 className="text-sm font-semibold text-ink-900 mb-3">{t('settings.data')}</h4>
          <div className="bg-surface-1 rounded-lg p-3 mb-3 flex items-center justify-between gap-3">
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
                className="w-16 border border-surface-3 rounded-lg px-2 py-1 text-sm text-right bg-surface-0 text-ink-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors num"
              />
            </div>
          </div>
          <div className="bg-surface-1 rounded-lg divide-y divide-surface-3">
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
          <h4 className="text-sm font-semibold text-ink-900 mb-3">{t('settings.account')}</h4>
          <div className="bg-surface-1 rounded-lg">
            <button onClick={onChangePassword} className={`${rowCls} rounded-lg`}>
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
