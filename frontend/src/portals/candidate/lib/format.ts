// ============================================================
// Clyptus Job Portal - Candidate Portal
// Formatting & Presentation Utilities
// ============================================================

import { ApplicationStage } from './types';

export function formatDate(input?: string | Date | null): string {
  if (!input) return '—';
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatRelative(input?: string | Date | null): string {
  if (!input) return '—';
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 604800) return `${Math.floor(diffSecs / 86400)}d ago`;
    return formatDate(d);
  } catch {
    return '—';
  }
}

export function getCompanyInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'CP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const STAGE_CONFIG: Record<
  ApplicationStage,
  { label: string; tone: 'gray' | 'blue' | 'indigo' | 'amber' | 'green' | 'red' }
> = {
  APPLIED: { label: 'Applied', tone: 'gray' },
  SCREENING: { label: 'In Review', tone: 'blue' },
  SHORTLISTED: { label: 'Shortlisted', tone: 'indigo' },
  INTERVIEW: { label: 'Interview Scheduled', tone: 'amber' },
  OFFER: { label: 'Offer Received', tone: 'green' },
  HIRED: { label: 'Hired', tone: 'green' },
  REJECTED: { label: 'Not Selected', tone: 'red' },
};

export function formatBytes(bytes?: number | null): string {
  if (bytes == null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSalaryDisplay(salary?: string | null): string {
  if (!salary || salary === 'Competitive') return salary || '';
  // The rupee sign is \u20B9. When backend outputs '?' due to encoding issues,
  // or strings like '?32.0 LPA - ?48.0 LPA', replace all '?' with '\u20B9'.
  // Also explicitly map currency 'INR' prefix to '\u20B9'.
  return salary
    .replace(/\?/g, '\u20B9')
    .replace(/\bINR\b\s*/gi, '\u20B9');
}

