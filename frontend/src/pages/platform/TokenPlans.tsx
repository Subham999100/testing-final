// ============================================================
// Clyptus Job Portal - Platform Token Plans & Pricing View
// Unified View for Platform Roles.
// Includes real-time searchable currency selection and editing.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ErrorBox, Table, columns } from '../../components/platform/OperationsUI';
import { PlatformService } from '../../services/platform.service';
import { TokenPlan } from '../../types/platform.types';
import { usePermissions } from '../../hooks/usePermissions';
import { TokenPlansGrid } from '../../features/platform/tokens/TokenPlansGrid';
import { CreateTokenPlanModal } from '../../features/platform/tokens/CreateTokenPlanModal';
import { EditTokenPlanModal } from '../../features/platform/tokens/EditTokenPlanModal';

export const TokenPlans: React.FC = () => {
  const [loadError, setLoadError] = useState<any>(null);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('platform.tokens.manage');

  const [plans, setPlans] = useState<TokenPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TokenPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = () => {
    setLoading(true);
    setLoadError(null);
    PlatformService.getTokenPlans()
      .then((data) => setPlans(data))
      .catch(setLoadError)
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

  const handleEditSubmit = async (planId: string, formData: any) => {
    setIsSubmitting(true);
    try {
      await PlatformService.write(`token-plans/${planId}`, formData, 'patch');
      setEditingPlan(null);
      loadPlans();
    } catch (err: any) {
      alert(`Error updating plan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <ErrorBox error={loadError} retry={loadPlans} />}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Token Plans & Pricing</h1>
          <p className="text-xs text-muted mt-1">
            Configure platform token packages, pricing thresholds, and multi-currency subscription tiers.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Token Plan
          </button>
        )}
      </div>

      {/* Shared Reusable PLAN CARDS GRID with Real-Time Currency Editing */}
      <TokenPlansGrid
        plans={plans}
        loading={loading}
        onEdit={canManage ? (plan) => setEditingPlan(plan) : undefined}
      />

      {canManage && (
        <Table
          path="token-plans"
          columns={columns('name', 'tokenAmount', 'priceCents', 'currency')}
          search={false}
          actions={(plan) => (
            <button
              type="button"
              onClick={() => setEditingPlan(plan)}
              className="px-2.5 py-1 text-xs font-semibold text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors"
            >
              Edit Real-Time Currency
            </button>
          )}
        />
      )}

      {/* Create Token Plan Modal (With Searchable Currency Select) */}
      {showCreateModal && (
        <CreateTokenPlanModal
          isOpen={showCreateModal}
          isSubmitting={isSubmitting}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Edit Token Plan Modal (Real-Time Currency Edit) */}
      {editingPlan && (
        <EditTokenPlanModal
          plan={editingPlan}
          isOpen={Boolean(editingPlan)}
          isSubmitting={isSubmitting}
          onClose={() => setEditingPlan(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
};

