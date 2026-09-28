// ============================================================
// Clyptus Job Portal - Platform Admin Management View
// Allows Platform Super Admin to create, oversee, and revoke
// Platform Admins with fine-grained permissions.
// Guarded by platform.admins.* permissions.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { PlatformAdminUser } from '../../types/platform.types';
import { usePermissions } from '../../hooks/usePermissions';
import { PlatformAdminTable } from '../../features/platform/admins/PlatformAdminTable';
import { CreatePlatformAdminModal } from '../../features/platform/admins/CreatePlatformAdminModal';

export const PlatformAdmins: React.FC = () => {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('platform.admins.create');

  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdmins = () => {
    setLoading(true);
    PlatformService.getAdmins()
      .then((res) => setAdmins(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleToggleStatus = async (admin: PlatformAdminUser) => {
    if (admin.role === 'PLATFORM_SUPER_ADMIN') {
      alert('Platform Super Admin status cannot be toggled here for root protection.');
      return;
    }
    const newStatus = !admin.isActive;
    if (
      confirm(
        `Set status for ${admin.firstName} ${admin.lastName} to ${
          newStatus ? 'ACTIVE' : 'DEACTIVATED'
        }?`,
      )
    ) {
      try {
        await PlatformService.toggleAdminStatus(admin.id, newStatus);
        loadAdmins();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    }
  };

  const handleCreateSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await PlatformService.createAdmin(formData);
      setShowCreateModal(false);
      loadAdmins();
    } catch (err: any) {
      alert(`Error creating admin: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Administrators</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage platform staff credentials, department associations, and explicit RBAC scopes.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Provision Admin
          </button>
        )}
      </div>

      {/* Admin Table */}
      <PlatformAdminTable
        admins={admins}
        loading={loading}
        onToggleStatus={handleToggleStatus}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlatformAdminModal
          isOpen={showCreateModal}
          isSubmitting={isSubmitting}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
        />
      )}
    </div>
  );
};
