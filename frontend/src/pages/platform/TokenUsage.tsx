// ============================================================
// Clyptus Job Portal - Platform Token Usage & Balance Adjustments
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Sliders,
  Building2,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  X,
  ShieldAlert,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation } from '../../types/platform.types';

export const TokenUsage: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjustment Form
  const [adjustment, setAdjustment] = useState({
    type: 'ALLOCATION',
    amount: 500,
    reason: '',
    referenceId: '',
  });

  const loadData = () => {
    setLoading(true);
    PlatformService.getOrganisations()
      .then((res) => setOrganisations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !adjustment.reason.trim()) return;

    setIsSubmitting(true);
    try {
      const signedAmount =
        adjustment.type === 'ADJUSTMENT' && adjustment.amount < 0
          ? adjustment.amount
          : adjustment.type === 'CONSUMPTION'
          ? -Math.abs(adjustment.amount)
          : Math.abs(adjustment.amount);

      await PlatformService.adjustTokens({
        organisationId: selectedOrg.id,
        type: adjustment.type,
        amount: signedAmount,
        reason: adjustment.reason,
        referenceId: adjustment.referenceId || undefined,
      });

      setShowAdjustModal(false);
      setSelectedOrg(null);
      setAdjustment({
        type: 'ALLOCATION',
        amount: 500,
        reason: '',
        referenceId: '',
      });
      loadData();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPlatformBalance = organisations.reduce((sum, o) => sum + (o.tokenBalance || 0), 0);
  const totalAllocated = organisations.reduce((sum, o) => sum + (o.allocatedTokens || 0), 0);
  const totalConsumed = organisations.reduce((sum, o) => sum + (o.consumedTokens || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Token Allocation & Balances</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor organisation balances and execute audited token adjustments.
          </p>
        </div>
      </div>

      {/* THREE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Active Circulating</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {totalPlatformBalance.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">tokens</span>
          </div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Lifetime Platform Allocations</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-300 font-mono">
              {totalAllocated.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">tokens</span>
          </div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Lifetime Platform Consumptions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300 font-mono">
              {totalConsumed.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">tokens</span>
          </div>
        </div>
      </div>

      {/* ORGANISATION BALANCES TABLE */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Tenant Balance Breakdown</h3>
          <span className="text-xs text-slate-400">All modifications logged immutably</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Organisation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Current Active Balance</th>
                <th className="py-3 px-4">Allocated</th>
                <th className="py-3 px-4">Consumed</th>
                <th className="py-3 px-4 text-right">Adjustment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Loading balances...
                  </td>
                </tr>
              ) : (
                organisations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-semibold text-white block">{org.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{org.slug}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                      {org.tokenBalance.toLocaleString()} tok
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {org.allocatedTokens.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-amber-300">
                      {org.consumedTokens.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowAdjustModal(true);
                        }}
                        className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded text-xs font-semibold transition-colors"
                      >
                        Modify Balance
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {showAdjustModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Adjust Tokens</h3>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="text-slate-400 block text-[11px]">Organisation:</span>
              <span className="font-semibold text-white text-sm">{selectedOrg.name}</span>
              <span className="text-emerald-400 font-mono block mt-1">
                Current Active Balance: {selectedOrg.tokenBalance} tokens
              </span>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
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
                  placeholder="e.g. Enterprise promotional grant or SLA compensation"
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
                  onClick={() => setShowAdjustModal(false)}
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
      )}
    </div>
  );
};
