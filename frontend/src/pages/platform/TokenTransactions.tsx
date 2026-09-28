// ============================================================
// Clyptus Job Portal - Platform Token Transactions Ledger View
// Central immutable ledger reflecting all credit/debit operations.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Filter,
  Search,
  Coins,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { TokenTransaction, TokenTransactionType } from '../../types/platform.types';

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

  const getTypeBadge = (type: TokenTransactionType) => {
    switch (type) {
      case 'PURCHASE':
      case 'ALLOCATION':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CONSUMPTION':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'REFUND':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'ADJUSTMENT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'EXPIRATION':
      case 'REVERSAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

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

      {/* LEDGER TABLE */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Organisation</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance Drift</th>
                <th className="py-3 px-4">Reason & Reference</th>
                <th className="py-3 px-4">Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    Loading ledger entries...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-300">{tx.id}</td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-semibold text-white block">
                        {tx.organisationName || tx.organisationId}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {tx.organisationSlug || tx.organisationId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${getTypeBadge(
                          tx.type,
                        )}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {tx.balanceBefore} → <span className="text-white font-bold">{tx.balanceAfter}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300 max-w-xs">
                      <span className="block truncate text-xs">{tx.reason || 'Ledger entry'}</span>
                      {tx.referenceId && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Ref: {tx.referenceId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
