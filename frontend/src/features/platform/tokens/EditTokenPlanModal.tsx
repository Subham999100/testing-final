// ============================================================
// Clyptus Job Portal - Edit Token Plan Modal Component
// Allows editing token packages in real-time including currency selection.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Layers, X, Save } from 'lucide-react';
import { TokenPlan } from '../../../types/platform.types';
import { CurrencySelect } from './CurrencySelect';

interface Props {
  plan: TokenPlan | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (planId: string, formData: any) => Promise<void>;
}

export const EditTokenPlanModal: React.FC<Props> = ({
  plan,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tokenAmount: 1000,
    priceCents: 9900,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    features: '',
    isActive: true,
  });

  useEffect(() => {
    if (plan) {
      const featStr = Array.isArray(plan.features)
        ? plan.features.join(', ')
        : typeof plan.features === 'string'
        ? plan.features
        : '';

      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        tokenAmount: plan.tokenAmount || 1000,
        priceCents: plan.priceCents || 9900,
        currency: plan.currency || 'USD',
        billingCycle: plan.billingCycle || 'MONTHLY',
        features: featStr,
        isActive: plan.isActive ?? true,
      });
    }
  }, [plan]);

  if (!isOpen || !plan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featureList = formData.features
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    onSubmit(plan.id, {
      ...formData,
      features: featureList,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl bg-surface border border-line rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-line bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                TOKEN ECONOMICS
              </span>
              <h3 className="text-base font-bold text-ink">Edit Token Package</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink">Plan Name *</label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink">Plan Code</label>
              <input
                type="text"
                disabled
                value={plan.code}
                className="w-full px-3 py-1.5 bg-soft border border-line rounded-lg text-xs text-muted font-mono cursor-not-allowed opacity-75"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink">Description</label>
            <input
              type="text"
              disabled={isSubmitting}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink">Tokens *</label>
              <input
                type="number"
                required
                min={1}
                disabled={isSubmitting}
                value={formData.tokenAmount}
                onChange={(e) => setFormData({ ...formData, tokenAmount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink">Price (in Cents) *</label>
              <input
                type="number"
                required
                min={0}
                disabled={isSubmitting}
                value={formData.priceCents}
                onChange={(e) => setFormData({ ...formData, priceCents: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-ink">Billing Cycle</label>
              <select
                value={formData.billingCycle}
                disabled={isSubmitting}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500"
              >
                <option value="ONE_TIME">One-time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
          </div>

          {/* Searchable Real-Time Currency Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink">Currency (Real-time Searchable) *</label>
            <CurrencySelect
              value={formData.currency}
              onChange={(curr) => setFormData({ ...formData, currency: curr })}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink">Features (Comma-separated)</label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-plan-active"
              checked={formData.isActive}
              disabled={isSubmitting}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded border-line-strong accent-orange-600 cursor-pointer"
            />
            <label htmlFor="edit-plan-active" className="text-xs font-semibold text-ink cursor-pointer">
              Active package (available for organization purchase)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Plan Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
