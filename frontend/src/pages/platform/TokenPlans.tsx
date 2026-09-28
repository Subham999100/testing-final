// ============================================================
// Clyptus Job Portal - Platform Token Plans & Pricing
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Check,
  Shield,
  Layers,
  Sparkles,
  X,
  CreditCard,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { TokenPlan } from '../../types/platform.types';

export const TokenPlans: React.FC = () => {
  const [plans, setPlans] = useState<TokenPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newPlan, setNewPlan] = useState({
    name: '',
    code: '',
    description: '',
    tokenAmount: 2500,
    priceCents: 19900,
    currency: 'USD',
    billingCycle: 'MONTHLY' as const,
    features: 'Resume Parsing, AI Job Matching, Multi-user Recruiter Access',
  });

  const loadPlans = () => {
    setLoading(true);
    PlatformService.getTokenPlans()
      .then((data) => setPlans(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const featureList = newPlan.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      await PlatformService.createTokenPlan({
        ...newPlan,
        features: featureList,
      });

      setShowCreateModal(false);
      setNewPlan({
        name: '',
        code: '',
        description: '',
        tokenAmount: 2500,
        priceCents: 19900,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        features: 'Resume Parsing, AI Job Matching, Multi-user Recruiter Access',
      });
      loadPlans();
    } catch (err: any) {
      alert(`Error creating plan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Token Plans & Pricing</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure platform token packages, pricing thresholds, and subscription tiers.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Token Plan
        </button>
      </div>

      {/* PLAN CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500 text-sm">
            Loading token plans...
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex flex-col justify-between relative overflow-hidden group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    {plan.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      plan.isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Archived'}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-white mt-2">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                {/* Price and Tokens */}
                <div className="my-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${(plan.priceCents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">/ {plan.billingCycle.toLowerCase()}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-xs font-semibold font-mono">
                    <Coins className="w-4 h-4" />
                    <span>{plan.tokenAmount.toLocaleString()} Tokens included</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Features Included:
                  </span>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Cycle: {plan.billingCycle}</span>
                <span className="font-mono text-[11px]">Rank: #{plan.sortOrder}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE PLAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Create Token Plan</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Scale Plan"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Plan Code (UPPERCASE) *</label>
                  <input
                    type="text"
                    required
                    placeholder="PLAN_SCALE"
                    value={newPlan.code}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                      })
                    }
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Description</label>
                <input
                  type="text"
                  placeholder="Target audience and plan summary"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Tokens *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPlan.tokenAmount}
                    onChange={(e) => setNewPlan({ ...newPlan, tokenAmount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Price (Cents) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPlan.priceCents}
                    onChange={(e) => setNewPlan({ ...newPlan, priceCents: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Billing Cycle</label>
                  <select
                    value={newPlan.billingCycle}
                    onChange={(e) => setNewPlan({ ...newPlan, billingCycle: e.target.value as any })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="ONE_TIME">One-Time</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Features (comma-separated)</label>
                <textarea
                  rows={2}
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30"
                >
                  {isSubmitting ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
