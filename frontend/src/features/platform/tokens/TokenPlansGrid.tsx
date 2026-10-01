// ============================================================
// Clyptus Job Portal - Shared Token Plans Grid
// Reusable by Platform Super Admin & Platform Admin.
// Real-time currency rendering and editing support.
// ============================================================

import React from 'react';
import { Sparkles, Coins, Check, Edit3 } from 'lucide-react';
import { TokenPlan } from '../../../types/platform.types';
import { formatPlanPrice, getCurrencyInfo } from './currencies';

interface Props {
  plans: TokenPlan[];
  loading: boolean;
  onEdit?: (plan: TokenPlan) => void;
}

export const TokenPlansGrid: React.FC<Props> = ({ plans, loading, onEdit }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-surface border border-line animate-pulse" />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-surface border border-line text-muted">
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

        const currency = getCurrencyInfo(plan.currency);

        return (
          <div
            key={plan.id}
            className="flex flex-col justify-between p-6 rounded-2xl bg-surface border border-line hover:border-orange-200 transition-all shadow-xs group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider font-mono">
                  {plan.code}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      plan.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-soft text-muted border border-line-strong'
                    }`}
                  >
                    {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(plan)}
                      className="p-1 rounded-md text-muted hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors"
                      title="Edit Plan Currency & Pricing"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-ink mt-4">{plan.name}</h3>
              <p className="text-xs text-muted mt-1">{plan.description}</p>

              <div className="mt-5 p-3 rounded-xl bg-soft border border-line flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">
                    Tokens Included
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span className="text-base font-bold text-ink font-mono">
                      {plan.tokenAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-muted block tracking-wider">
                    Price ({currency.code})
                  </span>
                  <span className="text-base font-bold text-orange-600 font-mono mt-0.5 block">
                    {formatPlanPrice(plan.priceCents, plan.currency)}
                  </span>
                </div>
              </div>

              {features.length > 0 && (
                <div className="mt-5 space-y-2">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                    Features Included
                  </span>
                  <ul className="space-y-1.5 text-xs text-ink">
                    {features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-line text-[11px] text-muted flex items-center justify-between">
              <span>Billing: {plan.billingCycle || 'One-time'}</span>
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(plan)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Edit Package
                </button>
              ) : (
                <span>ID: {plan.id.slice(0, 8)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
