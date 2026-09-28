// ============================================================
// Clyptus Job Portal - Shared Create Token Plan Modal
// Reusable by Platform Super Admin (and Admins if permitted).
// ============================================================

import React, { useState } from 'react';
import { Plus, X, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

export const CreateTokenPlanModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featureList = newPlan.features
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    onSubmit({
      ...newPlan,
      features: featureList,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Create Token Package</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Plan Name *</label>
              <input
                type="text"
                required
                value={newPlan.name}
                onChange={(e) =>
                  setNewPlan({
                    ...newPlan,
                    name: e.target.value,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                  })
                }
                placeholder="Enterprise Scale"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Plan Code *</label>
              <input
                type="text"
                required
                value={newPlan.code}
                onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toUpperCase() })}
                placeholder="PLAN_ENTERPRISE"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Description</label>
            <input
              type="text"
              value={newPlan.description}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              placeholder="High-volume hiring package with dedicated support."
              className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Token Amount *</label>
              <input
                type="number"
                required
                value={newPlan.tokenAmount}
                onChange={(e) => setNewPlan({ ...newPlan, tokenAmount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Price (in cents) *</label>
              <input
                type="number"
                required
                value={newPlan.priceCents}
                onChange={(e) => setNewPlan({ ...newPlan, priceCents: Number(e.target.value) })}
                placeholder="19900 = $199.00"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">
              Features (comma separated)
            </label>
            <textarea
              rows={2}
              value={newPlan.features}
              onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
