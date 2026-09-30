import type { Currency } from '@/lib/types';
import { CURRENCIES, CURRENCY_SYMBOL } from '@/lib/utils';

interface Props {
  value: Currency;
  onChange: (c: Currency) => void;
}

export default function CurrencyToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex bg-surface-2 rounded-lg p-0.5 shrink-0">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={`w-7 h-8 text-sm font-medium rounded-md transition-colors ${
            value === c ? 'bg-surface-0 text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          {CURRENCY_SYMBOL[c]}
        </button>
      ))}
    </div>
  );
}
