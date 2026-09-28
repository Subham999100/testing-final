// ============================================================
// Clyptus Job Portal - Platform Organisations View
// Unified View for Platform Super Admin & Platform Admin.
// Uses shared platform feature components with RBAC enforcement.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation } from '../../types/platform.types';
import { usePermissions } from '../../hooks/usePermissions';
import { OrganisationFilters } from '../../features/platform/organisations/OrganisationFilters';
import { OrganisationTable } from '../../features/platform/organisations/OrganisationTable';
import { CreateOrganisationModal } from '../../features/platform/organisations/CreateOrganisationModal';
import { SuspendOrganisationModal } from '../../features/platform/organisations/SuspendOrganisationModal';

export const Organisations: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('platform.organisations.create');

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suspendModalOrg, setSuspendModalOrg] = useState<Organisation | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOrganisations = () => {
    setLoading(true);
    PlatformService.getOrganisations({
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    })
      .then((res) => setOrganisations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrganisations();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrganisations();
  };

  const handleCreateSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await PlatformService.createOrganisation(formData);
      setShowCreateModal(false);
      loadOrganisations();
    } catch (err: any) {
      alert(`Error creating organisation: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModalOrg || suspendReason.trim().length < 10) return;
    setIsSubmitting(true);
    try {
      await PlatformService.suspendOrganisation(suspendModalOrg.id, suspendReason.trim());
      setSuspendModalOrg(null);
      setSuspendReason('');
      loadOrganisations();
    } catch (err: any) {
      alert(`Failed to suspend organisation: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (org: Organisation) => {
    if (confirm(`Are you sure you want to reactivate ${org.name}?`)) {
      try {
        await PlatformService.activateOrganisation(org.id);
        loadOrganisations();
      } catch (err: any) {
        alert(`Failed to activate organisation: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organisation Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Oversee tenant organizations, audit compliance, token balances, and lifecycle state.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Organisation
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <OrganisationFilters
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Organisation Table */}
      <OrganisationTable
        organisations={organisations}
        loading={loading}
        onSuspendClick={(org) => setSuspendModalOrg(org)}
        onActivateClick={handleActivate}
      />

      {/* Suspension Modal */}
      {suspendModalOrg && (
        <SuspendOrganisationModal
          org={suspendModalOrg}
          reason={suspendReason}
          isSubmitting={isSubmitting}
          onReasonChange={setSuspendReason}
          onConfirm={handleSuspendConfirm}
          onClose={() => {
            setSuspendModalOrg(null);
            setSuspendReason('');
          }}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateOrganisationModal
          isSubmitting={isSubmitting}
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};
