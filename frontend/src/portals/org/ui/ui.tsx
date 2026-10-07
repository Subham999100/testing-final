// ============================================================
// Organisation portal — small light-theme UI kit (Tailwind only).
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { Coins, Loader2, X, Eye, EyeOff } from 'lucide-react';
import React, { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { PageMeta } from '../lib/api';
import { label } from '../lib/format';
import { usePermissions, useWallet } from '../lib/session';

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

// ---------------- Button ----------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: React.ElementType;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});

// ---------------- Form controls ----------------

const control =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { disableToggle?: boolean }>(function Input({ className, type, disableToggle, ...p }, ref) {
  const [showPassword, setShowPassword] = useState(false);

  if (type === 'password' && !disableToggle) {
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(control, 'h-9 pr-9', className)}
          {...p}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return <input ref={ref} type={type} className={cn(control, 'h-9', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...p },
  ref,
) {
  return <textarea ref={ref} className={cn(control, 'min-h-[80px]', className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...p },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, 'h-9 pr-8', className)} {...p}>
      {children}
    </select>
  );
});

export function Field({ label: text, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-slate-600">{text}</span>
      {children}
      {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

// ---------------- Layout pieces ----------------

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, subtitle }: { title: React.ReactNode; action?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-1 inline-block text-xs font-medium text-indigo-600 hover:underline">
            ← {back.label}
          </Link>
        )}
        <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: React.ElementType; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 rounded-full bg-indigo-50 p-3 text-indigo-500">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-100', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function KpiCard({ label: text, value, hint, icon: Icon, to, tone = 'indigo' }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ElementType; to?: string; tone?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  const body = (
    <Card className={cn('p-4 transition-shadow', to && 'hover:shadow-md')}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{text}</span>
        {Icon && (
          <span className={cn('rounded-lg p-1.5', tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

// ---------------- Badges ----------------

const TONES = {
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  sky: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONES[tone], className)}>{children}</span>;
}

/** One colour language for every status across the portal. */
const STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'gray',
  IN_REVIEW: 'amber',
  PUBLISHED: 'green',
  PAUSED: 'amber',
  CLOSED: 'gray',
  ARCHIVED: 'gray',
  APPLIED: 'blue',
  SCREENING: 'indigo',
  SHORTLISTED: 'violet',
  INTERVIEW: 'amber',
  OFFER: 'sky',
  HIRED: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'gray',
  SCHEDULED: 'blue',
  FEEDBACK_PENDING: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'gray',
  NO_SHOW: 'red',
  PENDING_APPROVAL: 'amber',
  APPROVED: 'indigo',
  SENT: 'blue',
  ACCEPTED: 'green',
  EXPIRED: 'gray',
  PENDING: 'amber',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  REMOVED: 'gray',
  CREATED: 'amber',
  PAID: 'green',
  FAILED: 'red',
  OPEN: 'blue',
  DONE: 'green',
  SUCCEEDED: 'green',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'gray'}>{label(status)}</Badge>;
}

export function TokenCostBadge({ cost }: { cost: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200" title={`Costs ${cost} tokens`}>
      <Coins className="h-3 w-3" />
      {cost}
    </span>
  );
}

/**
 * Token-aware action: shows the cost, is disabled with a reason when the
 * member cannot afford it, and asks for confirmation above the org threshold.
 */
export function TokenButton({
  cost,
  onConfirm,
  children,
  loading,
  confirmText,
  alreadyPaid,
  ...rest
}: Omit<ButtonProps, 'onClick'> & { cost: number; onConfirm: () => void; confirmText?: string; alreadyPaid?: boolean }) {
  const { data: wallet } = useWallet();
  const [open, setOpen] = React.useState(false);
  const effective = alreadyPaid ? 0 : cost;
  const short = wallet && effective > wallet.spendable;
  const needsConfirm = wallet && effective > 0 && effective >= wallet.confirmThreshold;
  return (
    <>
      <span title={short ? `Needs ${effective} tokens — you have ${wallet.spendable}` : undefined}>
        <Button {...rest} loading={loading} disabled={rest.disabled || !!short} onClick={() => (needsConfirm ? setOpen(true) : onConfirm())}>
          {children}
          {effective > 0 && <TokenCostBadge cost={effective} />}
        </Button>
      </span>
      <ConfirmDialog
        open={open}
        title="Spend tokens?"
        message={confirmText ?? `This will use ${effective} tokens${wallet ? ` (you have ${wallet.spendable})` : ''}.`}
        confirmLabel={`Spend ${effective} tokens`}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}

// ---------------- Overlays ----------------

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/20" onClick={onClose} />
      <div className={cn('relative flex h-full w-full flex-col bg-white shadow-xl', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {children && <div className="mt-3 text-sm text-slate-600">{children}</div>}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'primary',
  loading,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
      {children}
    </Modal>
  );
}

// ---------------- Navigation helpers ----------------

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            value === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function FilterChips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
            value === o.value ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Hides children unless the viewer holds any of the permissions (UI only — the API enforces). */
export function PermissionGate({ perm, children, fallback = null }: { perm: string | string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = usePermissions();
  const keys = Array.isArray(perm) ? perm : [perm];
  return <>{can(...keys) ? children : fallback}</>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700', className)}>{initials}</span>;
}

export function Stat({ label: text, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{text}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}
