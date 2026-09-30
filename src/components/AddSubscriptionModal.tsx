import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Save, BellRing, CalendarClock } from 'lucide-react';
import Modal from './Modal';
import Select, { type SelectOption } from './Select';
import DatePicker from './DatePicker';
import CategoryInput from './CategoryInput';
import CurrencyToggle from './CurrencyToggle';
import Checkbox from './Checkbox';
import type { Subscription, Status, PeriodPreset, Currency } from '@/lib/types';
import { PERIOD_DAYS, addDays, daysBetween, toISO, CURRENCY_SYMBOL } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (s: Subscription) => void;
  initial?: Subscription;
  categories: string[];
  onDeleteCategory: (c: string) => void;
}

const statusOpts = (t: (k: string) => string): SelectOption[] => [
  { value: 'active', label: t('status.active') },
  { value: 'paused', label: t('status.paused') },
  { value: 'cancelled', label: t('status.cancelled') },
];

const inputCls =
  'w-full border border-surface-3 rounded-lg px-3 py-2 text-sm bg-surface-0 text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors';

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1">{label}</label>
      {children}
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function AddSubscriptionModal({ open, onClose, onSave, initial, categories, onDeleteCategory }: Props) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(String(initial?.amount ?? ''));
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'CNY');
  const [preset, setPreset] = useState<PeriodPreset>(initial?.period_preset ?? 'month');
  const [startDate, setStartDate] = useState(initial?.start_date ?? toISO(new Date()));
  const [endDate, setEndDate] = useState(initial?.end_date ?? '');
  const [endTouched, setEndTouched] = useState(!!initial?.end_date);
  const [category, setCategory] = useState(initial?.category ?? '');
  const [status, setStatus] = useState<Status>(initial?.status ?? 'active');
  const [remindEnabled, setRemindEnabled] = useState(initial?.remind_enabled ?? false);
  const [remindDate, setRemindDate] = useState(initial?.remind_date ?? '');

  const periodOpts: SelectOption[] = (['week', 'month', 'quarter', 'half', 'year', 'custom'] as PeriodPreset[]).map(
    (p) => ({ value: p, label: t(`period.${p}`) }),
  );

  // end date follows start + preset until the user edits it themselves
  // ('custom' means the user picks an arbitrary range, so nothing is derived)
  useEffect(() => {
    if (preset === 'custom' || endTouched) return;
    setEndDate(startDate ? addDays(startDate, PERIOD_DAYS[preset]) : '');
  }, [startDate, preset, endTouched]);

  // default the reminder to 3 days before the cycle ends
  useEffect(() => {
    if (!remindEnabled || remindDate || !endDate) return;
    setRemindDate(addDays(endDate, -3));
  }, [remindEnabled, remindDate, endDate]);

  const spanDays = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const isCustomSpan = preset !== 'custom' && spanDays > 0 && spanDays !== PERIOD_DAYS[preset];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !endDate) return;
    onSave({
      id: initial?.id,
      name,
      amount: Number(amount),
      currency,
      period_preset: preset,
      period_days: spanDays > 0 ? spanDays : preset === 'custom' ? 0 : PERIOD_DAYS[preset],
      start_date: startDate || null,
      end_date: endDate,
      category: category.trim() || null,
      status,
      remind_enabled: remindEnabled,
      remind_date: remindEnabled ? remindDate || null : null,
      notes: initial?.notes,
      created_at: initial?.created_at ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      id="add-sub"
      open={open}
      onClose={onClose}
      title={initial ? t('table.edit') : t('add.subscription')}
      icon={<Plus className="w-5 h-5 text-brand-600" />}
    >
      <form onSubmit={onSubmit} className="p-5 space-y-3">
        <Field label={`${t('add.name')} *`}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('add.subNamePlaceholder')}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label={`${t('add.amount')} *`}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500 pointer-events-none">
                    {CURRENCY_SYMBOL[currency]}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="68.00"
                    className={`${inputCls} pl-7 num`}
                  />
                </div>
                <CurrencyToggle value={currency} onChange={setCurrency} />
              </div>
            </Field>
          </div>
          <Field label={t('add.period')}>
            <Select value={preset} onChange={(v) => setPreset(v as PeriodPreset)} options={periodOpts} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('add.startDate')}>
            <DatePicker value={startDate} onChange={setStartDate} placeholder={t('add.startDate')} />
          </Field>
          <Field
            label={t('add.endDate')}
            hint={
              isCustomSpan ? (
                <span className="text-amber-700">{t('add.customSpan', { n: spanDays })}</span>
              ) : spanDays > 0 ? (
                t('add.spanDays', { n: spanDays })
              ) : undefined
            }
          >
            <DatePicker
              value={endDate}
              onChange={(v) => {
                setEndTouched(true);
                setEndDate(v);
              }}
              placeholder={t('add.endDate')}
            />
          </Field>
        </div>

        {endTouched && preset !== 'custom' && (
          <button
            type="button"
            onClick={() => setEndTouched(false)}
            className="text-xs text-brand-600 hover:text-brand-700 transition-colors"
          >
            {t('add.recalcEnd')}
          </button>
        )}

        <Field label={t('add.category')}>
          <CategoryInput
            value={category}
            onChange={setCategory}
            categories={categories}
            onDeleteCategory={onDeleteCategory}
            placeholder={t('add.categoryPlaceholder')}
          />
        </Field>

        <Field label={t('add.status')}>
          <Select value={status} onChange={(v) => setStatus(v as Status)} options={statusOpts(t)} />
        </Field>

        <div className="pt-3 border-t border-surface-3 mt-1 space-y-3">
          <Checkbox
            checked={remindEnabled}
            onChange={setRemindEnabled}
            label={t('add.remind')}
            ariaLabel="remind-enabled"
          />
          {remindEnabled && (
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-ink-400 shrink-0" />
              <div className="flex-1">
                <DatePicker value={remindDate} onChange={setRemindDate} placeholder={t('add.remindDate')} />
              </div>
              <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
            </div>
          )}
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
            {t('add.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
