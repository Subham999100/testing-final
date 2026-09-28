// ============================================================
// Clyptus Job Portal - Platform Token Usage & Balance View
// Unified View for Platform Roles.
// Utilizes shared TokenBalanceTable & AdjustTokensModal.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Coins, TrendingDown, TrendingUp } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation } from '../../types/platform.types';
import { TokenBalanceTable } from '../../features/platform/tokens/TokenBalanceTable';
import { AdjustTokensModal } from '../../features/platform/tokens/AdjustTokensModal';

export const TokenUsage: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organisation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    PlatformService.getOrganisations()
      .then((res) => setOrganisations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (payload: {
    type: string;
    amount: number;
    reason: string;
    referenceId?: string;
  }) => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      const signedAmount =
        payload.type === 'ADJUSTMENT' && payload.amount < 0
          ? payload.amount
          : payload.type === 'CONSUMPTION'
          ? -Math.abs(payload.amount)
          : Math.abs(payload.amount);

      await PlatformService.adjustTokens({
        organisationId: selectedOrg.id,
        type: payload.type,
        amount: signedAmount,
        reason: payload.reason,
        referenceId: payload.referenceId,
      });

      setSelectedOrg(null);
      loadData();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPlatformBalance = organisations.reduce((sum, o) => sum + (o.tokenBalance || 0), 0);
  const totalAllocated = organisations.reduce(
    (sum, o) => sum + (o.allocatedTokens || o.tokenBalance + o.consumedTokens || 0),
    0,
  );
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Active Tokens
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {totalPlatformBalance.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Current circulating supply across tenants</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Lifetime Allocated
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {totalAllocated.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Total provisioned via plans & adjustments</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Lifetime Consumed
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {totalConsumed.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Burned on candidate operations & AI matching</p>
          </div>
        </div>
      </div>

      {/* Shared Reusable Balance Table */}
      <TokenBalanceTable
        organisations={organisations}
        loading={loading}
        onAdjustClick={(org) => setSelectedOrg(org)}
      />

      {/* Shared Adjust Tokens Modal */}
      {selectedOrg && (
        <AdjustTokensModal
          org={selectedOrg}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedOrg(null)}
          onSubmit={handleAdjustSubmit}
        />
      )}
    </div>
  );
};
