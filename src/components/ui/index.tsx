// Small shared UI primitives (Tailwind).
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { STATUS_COLORS } from '@/lib/metrics';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 border-navy-800',
  secondary: 'bg-surface text-ink-900 hover:border-ink-300 border-ink-200',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 border-transparent',
  danger: 'bg-surface text-red-700 hover:bg-red-50 border-red-200',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; size?: 'sm' | 'md' }>(
  function Button({ variant = 'secondary', icon: Icon, size = 'md', className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cx(
          'inline-flex items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
          variants[variant],
          className,
        )}
        {...rest}
      >
        {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />}
        {children}
      </button>
    );
  },
);

export function IconButton({ icon: Icon, label, active, onClick, className }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'grid h-9 w-9 place-items-center rounded-md border transition-colors',
        active ? 'border-nexus-400 bg-nexus-100 text-heading' : 'border-transparent text-ink-700 hover:bg-ink-100',
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

export function Chip({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-700', className)}>
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export const StatusChip = ({ status }: { status: string }) => <Chip color={STATUS_COLORS[status] ?? '#94a3b8'}>{status}</Chip>;

export function ZoneSwatch({ color, className }: { color: string; className?: string }) {
  return <span className={cx('inline-block h-3 w-3 shrink-0 rounded-[3px]', className)} style={{ background: color }} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">{children}</div>;
}
