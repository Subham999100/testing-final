// ============================================================
// Organisation portal — tiny toast system (zustand) with optional
// action button (used for 5-second undo on reversible bulk actions).
// ============================================================

import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { create } from 'zustand';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ttl?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t, ttl = 4000) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), ttl);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message: string, action?: Toast['action']) => useToasts.getState().push({ tone: 'success', message, action }, action ? 5000 : 3500),
  error: (message: string) => useToasts.getState().push({ tone: 'error', message }, 6000),
  info: (message: string) => useToasts.getState().push({ tone: 'info', message }),
};

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE = {
  success: 'border-emerald-200 bg-white text-slate-800 [&_svg]:text-emerald-500',
  error: 'border-rose-200 bg-white text-slate-800 [&_svg]:text-rose-500',
  info: 'border-slate-200 bg-white text-slate-800 [&_svg]:text-indigo-500',
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${TONE[t.tone]}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                className="font-semibold text-indigo-600 hover:underline"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
