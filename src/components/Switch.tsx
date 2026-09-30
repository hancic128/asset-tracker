import { type ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  ariaLabel?: string;
}

/** Binary switch (设计规范 7.4 Switch)：滑块在右，点击即切换。 */
export default function Switch({ checked, onChange, label, ariaLabel }: Props) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-brand-600' : 'bg-surface-4'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-surface-0 shadow-sm transition-all ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}
