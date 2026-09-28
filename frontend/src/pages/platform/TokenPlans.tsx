// ============================================================
// Clyptus Job Portal - Platform Token Plans & Pricing View
// Unified View for Platform Roles.
// Utilizes shared TokenPlansGrid & CreateTokenPlanModal.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { TokenPlan } from '../../types/platform.types';
import { usePermissions } from '../../hooks/usePermissions';
import { TokenPlansGrid } from '../../features/platform/tokens/TokenPlansGrid';
import { CreateTokenPlanModal } from '../../features/platform/tokens/CreateTokenPlanModal';

export const TokenPlans: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('platform.tokens.manage');

  const [plans, setPlans] = useState<TokenPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = () => {
    setLoading(true);
    PlatformService.getTokenPlans()
      .then((data) => setPlans(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreateSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await PlatformService.createTokenPlan(formData);
      setShowCreateModal(false);
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
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Token Plan
          </button>
        )}
      </div>

      {/* Shared Reusable PLAN CARDS GRID */}
      <TokenPlansGrid plans={plans} loading={loading} />

      {/* Shared Create Modal */}
      {showCreateModal && (
        <CreateTokenPlanModal
          isOpen={showCreateModal}
          isSubmitting={isSubmitting}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
        />
      )}
    </div>
  );
};
