// ============================================================
// Organisation portal — formatters and label helpers
// ============================================================

import { useEffect, useState } from 'react';

export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export function fmtRelative(d?: string | Date | null) {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(-Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day');
  return fmtDate(d);
}

export const fmtMoney = (amountMinor: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
};

export const fmtSalary = (amount?: number | null, currency = 'INR') => {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

export const fmtNum = (n?: number | null) => (n == null ? '—' : n.toLocaleString());

export const label = (s?: string | null) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—';

export const splitList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export const toLocalInput = (d?: string | Date | null) => {
  if (!d) return '';
  const date = new Date(d);
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
};
