import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, Save } from 'lucide-react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import type { StoredValueCard } from '@/lib/types';
import { addDays, toISO } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  card?: StoredValueCard;
  onConfirm: (expiresAt: string) => void;
}

/** 卡延期弹窗：直接改 expires_at，不新建记录（同一张卡的额度延续，余额/余次不变）。 */
export default function ExtendCardModal({ open, onClose, card, onConfirm }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!open || !card) return;
    // 默认从「原过期日 / 今天」里较晚者往后延 1 年
    const base = card.expires_at && card.expires_at > toISO(new Date()) ? card.expires_at : toISO(new Date());
    setDate(addDays(base, 365));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !date) return;
    onConfirm(date);
    onClose();
  };

  return (
    <Modal
      id="extend-card"
      open={open}
      onClose={onClose}
      title={t('confirm.extendTitle', { name: card?.name ?? '' })}
      icon={<CalendarPlus className="w-5 h-5 text-brand-600" />}
    >
      {card && (
        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <p className="text-xs text-ink-500">{t('renew.extendHint')}</p>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">{t('renew.extend')}</label>
            <DatePicker value={date} onChange={setDate} placeholder={t('renew.extend')} />
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
              {t('renew.extendConfirm')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
