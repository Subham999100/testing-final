// ============================================================
// Clyptus Job Portal - Shared Token Plans Grid
// Reusable by Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { Sparkles, Coins, Check } from 'lucide-react';
import { TokenPlan } from '../../../types/platform.types';

interface Props {
  plans: TokenPlan[];
  loading: boolean;
}

export const TokenPlansGrid: React.FC<Props> = ({ plans, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
        No token plans found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const features = Array.isArray(plan.features)
          ? plan.features
          : typeof plan.features === 'string'
          ? (plan.features as string).split(',').map((f) => f.trim())
          : [];

        return (
          <div
            key={plan.id}
            className="flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  {plan.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    plan.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-4">{plan.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{plan.description}</p>

              <div className="mt-5 p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                    Tokens Included
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-base font-bold text-white font-mono">
                      {plan.tokenAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                    Price
                  </span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    ${(plan.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {features.length > 0 && (
                <div className="mt-5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Features Included
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Billing: {plan.billingCycle || 'One-time'}</span>
              <span>ID: {plan.id.slice(0, 8)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
