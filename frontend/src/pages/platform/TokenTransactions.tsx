// ============================================================
// Clyptus Job Portal - Platform Token Transactions Ledger View
// Unified Immutable Ledger View for Platform Roles.
// Utilizes shared TokenLedgerTable.
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Filter, RefreshCw } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { TokenTransaction } from '../../types/platform.types';
import { TokenLedgerTable } from '../../features/platform/tokens/TokenLedgerTable';

export const TokenTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const loadTransactions = () => {
    setLoading(true);
    PlatformService.getTokenTransactions({
      type: typeFilter !== 'ALL' ? typeFilter : undefined,
    })
      .then((res) => setTransactions(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTransactions();
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Immutable Token Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Permanent transaction ledger of all platform allocations, consumptions, and refunds.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Ledger Integrity Verified</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">Transaction Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Ledger Events</option>
            <option value="PURCHASE">Purchase</option>
            <option value="ALLOCATION">Allocation</option>
            <option value="CONSUMPTION">Consumption</option>
            <option value="REFUND">Refund</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="EXPIRATION">Expiration</option>
            <option value="REVERSAL">Reversal</option>
          </select>
        </div>

        <button
          onClick={loadTransactions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Shared Reusable LEDGER TABLE */}
      <TokenLedgerTable transactions={transactions} loading={loading} />
    </div>
  );
};
