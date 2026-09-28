// ============================================================
// Clyptus Job Portal - Shared Adjust Tokens Modal
// Reusable by Platform Super Admin and Platform Admins with adjustment permissions.
// ============================================================

import React, { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { Organisation } from '../../../types/platform.types';

interface Props {
  org: Organisation;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { type: string; amount: number; reason: string; referenceId?: string }) => Promise<void>;
}

export const AdjustTokensModal: React.FC<Props> = ({
  org,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [adjustment, setAdjustment] = useState({
    type: 'ALLOCATION',
    amount: 500,
    reason: '',
    referenceId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustment.reason.trim()) return;
    onSubmit(adjustment);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Adjust Tokens</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
          <span className="text-slate-400 block text-[11px]">Target Tenant:</span>
          <span className="font-semibold text-white text-sm">{org.name}</span>
          <span className="text-emerald-400 font-mono block mt-1">
            Current Active Balance: {org.tokenBalance} tokens
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Transaction Type *</label>
              <select
                value={adjustment.type}
                onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="ALLOCATION">Manual Allocation (+)</option>
                <option value="REFUND">Refund (+)</option>
                <option value="ADJUSTMENT">Manual Adjustment (+ / -)</option>
                <option value="CONSUMPTION">Manual Debit (-)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Token Delta *</label>
              <input
                type="number"
                required
                value={adjustment.amount}
                onChange={(e) => setAdjustment({ ...adjustment, amount: Number(e.target.value) })}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Audit Justification / Reason *</label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise contractual grant or SLA credit"
              value={adjustment.reason}
              onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Reference Identifier</label>
            <input
              type="text"
              placeholder="e.g. ticket_9918 or inv_2026_09"
              value={adjustment.referenceId}
              onChange={(e) => setAdjustment({ ...adjustment, referenceId: e.target.value })}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
            />
          </div>

          <div className="p-2.5 rounded bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300">
            A permanent transaction ledger entry will be recorded under your administrator ID.
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !adjustment.reason.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              {isSubmitting ? 'Recording Ledger...' : 'Commit Ledger Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
