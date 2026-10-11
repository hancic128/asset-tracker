import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Save } from 'lucide-react';
import Modal from './Modal';
import Select, { type SelectOption } from './Select';
import DatePicker from './DatePicker';
import type { Subscription, PeriodPreset } from '@/lib/types';
import { PERIOD_DAYS, addDays, daysBetween, effectivePeriodDays, CURRENCY_SYMBOL } from '@/lib/utils';

export interface RenewPayload {
  start_date: string;
  end_date: string;
  amount: number;
  period_preset: PeriodPreset;
  period_days: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 被续订的上一周期；为空则弹窗不渲染内容 */
  sub?: Subscription;
  onConfirm: (payload: RenewPayload) => void;
}

const inputCls =
  'w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors';

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1">{label}</label>
      {children}
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}

/** 续订弹窗：预填「新周期」，金额与周期可在此调整。
 *
 *  起因：旧续订是一键复制（金额原样搬过去），涨价后只能「先续订、再编辑新记录」两步。
 *  这里把新周期的起止日、金额、周期都摊开让你一次确认。
 *
 *  新周期从「旧 end_date + 1 天」开始 —— 摊销窗口是含首尾的（validitySpan），
 *  旧窗口 [s, e] 与新窗口 [e, e+N] 若都含 e，那一天会被重复计费。
 */
export default function RenewSubscriptionModal({ open, onClose, sub, onConfirm }: Props) {
  const { t } = useTranslation();

  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTouched, setEndTouched] = useState(false);

  useEffect(() => {
    if (!open || !sub) return;
    const cycle = effectivePeriodDays(sub);
    const start = addDays(sub.end_date ?? '', 1) || sub.end_date || '';
    setAmount(String(sub.amount ?? ''));
    setPreset((sub.period_preset ?? 'month') as PeriodPreset);
    setStartDate(start);
    setEndDate(addDays(start, cycle));
    setEndTouched(false);
    // sub 作 dep：父组件每次点续订都会换引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sub]);

  // 改周期或改开始日 → 重算截止日（用户手改过就不覆盖，custom 除外）
  useEffect(() => {
    if (endTouched) return;
    if (preset === 'custom') return;
    if (!startDate) return;
    setEndDate(addDays(startDate, PERIOD_DAYS[preset]));
  }, [startDate, preset, endTouched]);

  const periodOpts: SelectOption[] = (['week', 'month', 'quarter', 'half', 'year', 'custom'] as PeriodPreset[]).map(
    (p) => ({ value: p, label: t(`period.${p}`) }),
  );

  const spanDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const newAmount = Number(amount) || 0;
  const oldAmount = Number(sub?.amount ?? 0);
  // 涨/降价对比：同一订阅的货币，直接比数值
  const delta = oldAmount > 0 ? Math.round(((newAmount - oldAmount) / oldAmount) * 100) : 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub || !amount || !endDate || !startDate) return;
    onConfirm({
      start_date: startDate,
      end_date: endDate,
      amount: newAmount,
      period_preset: preset,
      period_days: spanDays > 0 ? spanDays : preset === 'custom' ? 0 : PERIOD_DAYS[preset],
    });
    onClose();
  };

  const cur = CURRENCY_SYMBOL[sub?.currency ?? 'CNY'];

  return (
    <Modal
      id="renew-sub"
      open={open}
      onClose={onClose}
      title={t('confirm.renewTitle', { name: sub?.name ?? '' })}
      icon={<RefreshCw className="w-5 h-5 text-brand-600" />}
    >
      {sub && (
        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <p className="text-xs text-ink-500">{t('renew.subtitle')}</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('renew.newStart')}>
              <DatePicker value={startDate} onChange={setStartDate} placeholder={t('renew.newStart')} />
            </Field>
            <Field
              label={t('renew.newEnd')}
              hint={spanDays > 0 ? t('renew.endHint', { n: spanDays }) : undefined}
            >
              <DatePicker
                value={endDate}
                onChange={(v) => {
                  setEndTouched(true);
                  setEndDate(v);
                }}
                placeholder={t('renew.newEnd')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field
                label={t('renew.amount')}
                hint={
                  <span className={delta > 0 ? 'text-warn' : delta < 0 ? 'text-ok' : ''}>
                    {delta > 0
                      ? t('renew.priceUp', { pct: delta })
                      : delta < 0
                        ? t('renew.priceDown', { pct: -delta })
                        : t('renew.priceSame')}
                  </span>
                }
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">
                    {cur}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    className={`${inputCls} pl-7 num`}
                  />
                </div>
              </Field>
            </div>
            <Field label={t('renew.period')}>
              <Select value={preset} onChange={(v) => setPreset(v as PeriodPreset)} options={periodOpts} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-2 rounded-lg transition-colors"
            >
              {t('add.cancel')}
            </button>
            <button
              type="submit"
              className="bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-brand-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t('renew.confirm')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
