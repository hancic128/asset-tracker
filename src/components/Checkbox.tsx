import { Check } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  ariaLabel?: string;
}

export default function Checkbox({ checked, onChange, label, ariaLabel }: Props) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-brand-600 border-brand-600' : 'bg-surface-0 border-surface-3 hover:border-brand-500'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}
