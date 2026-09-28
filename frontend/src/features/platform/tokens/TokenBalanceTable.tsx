// ============================================================
// Clyptus Job Portal - Shared Token Balance Table
// Displays organisation token balances and utilization.
// Reusable by Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { Building2, Sliders } from 'lucide-react';
import { Organisation } from '../../../types/platform.types';
import { usePermissions } from '../../../hooks/usePermissions';

interface Props {
  organisations: Organisation[];
  loading: boolean;
  onAdjustClick: (org: Organisation) => void;
}

export const TokenBalanceTable: React.FC<Props> = ({
  organisations,
  loading,
  onAdjustClick,
}) => {
  const { hasPermission } = usePermissions();
  const canAdjust = hasPermission('platform.tokens.adjust');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Tenant Balance Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active balances, lifetime allocations, and operational consumption.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Organisation</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Current Balance</th>
              <th className="py-3 px-4">Lifetime Allocated</th>
              <th className="py-3 px-4">Consumed</th>
              <th className="py-3 px-4">Utilization</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Loading balances...
                </td>
              </tr>
            ) : organisations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No organisations found.
                </td>
              </tr>
            ) : (
              organisations.map((org) => {
                const allocated = org.allocatedTokens || (org.tokenBalance + org.consumedTokens) || 1;
                const percent = Math.min(100, Math.round((org.consumedTokens / allocated) * 100));

                return (
                  <tr key={org.id} className="hover:bg-slate-800/30 transition-colors font-sans">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{org.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{org.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {org.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-emerald-400 text-sm">
                        {org.tokenBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {(org.allocatedTokens || org.tokenBalance + org.consumedTokens).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">
                      {org.consumedTokens.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent > 85
                                ? 'bg-rose-500'
                                : percent > 60
                                ? 'bg-amber-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canAdjust && (
                        <button
                          onClick={() => onAdjustClick(org)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
                        >
                          <Sliders className="w-3 h-3" />
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
