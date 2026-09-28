// ============================================================
// Clyptus Job Portal - Shared Token Ledger Table
// Reusable by both Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { TokenTransaction, TokenTransactionType } from '../../../types/platform.types';

interface Props {
  transactions: TokenTransaction[];
  loading: boolean;
}

export const TokenLedgerTable: React.FC<Props> = ({ transactions, loading }) => {
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
  );
};
