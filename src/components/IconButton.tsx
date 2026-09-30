import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  iconOnly?: boolean;
  children?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-surface-0 border border-surface-3 text-ink-700 hover:bg-surface-2 ',
  ghost: 'text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export default function IconButton({ variant = 'secondary', iconOnly, className = '', children, ...rest }: Props) {
  const size = iconOnly ? 'w-9 h-9' : 'px-4 py-2 text-sm';
  const radius = iconOnly ? 'rounded-lg' : 'rounded-lg';
  return (
    <button
      {...rest}
      className={`${size} ${radius} font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
