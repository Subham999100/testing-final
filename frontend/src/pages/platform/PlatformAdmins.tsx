import { ErrorBox } from "../../components/platform/OperationsUI";
// ============================================================
// Clyptus Job Portal - Platform Admin Management View
// Allows Platform Super Admin to create, oversee, and revoke
// Platform Admins with fine-grained permissions.
// Guarded by platform.admins.* permissions.
// ============================================================

import { AdminPermissions } from "../../features/platform/admins/AdminPermissions";
import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { PlatformService } from "../../services/platform.service";
import { PlatformAdminUser } from "../../types/platform.types";
import { usePermissions } from "../../hooks/usePermissions";
import { PlatformAdminTable } from "../../features/platform/admins/PlatformAdminTable";
import { CreatePlatformAdminModal } from "../../features/platform/admins/CreatePlatformAdminModal";

export const PlatformAdmins: React.FC = () => {
  const [loadError, setLoadError] = useState<any>(null);
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("platform.admins.create");

  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdmins = () => {
    setLoading(true);
    setLoadError(null);
    PlatformService.getAdmins()
      .then((res) => setAdmins(res.data))
      .catch(setLoadError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleToggleStatus = async (admin: PlatformAdminUser) => {
    if (admin.role === "PLATFORM_SUPER_ADMIN") {
      alert(
        "Platform Super Admin status cannot be toggled here for root protection.",
      );
      return;
    }
    const newStatus = !admin.isActive;
    if (
      confirm(
        `Set status for ${admin.firstName} ${admin.lastName} to ${
          newStatus ? "ACTIVE" : "DEACTIVATED"
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

  if (showCreateModal) {
    return (
      <CreatePlatformAdminModal
        isOpen={showCreateModal}
        isSubmitting={isSubmitting}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {loadError && <ErrorBox error={loadError} retry={loadAdmins} />}
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Platform Administrators
          </h1>
          <p className="text-xs text-muted mt-1">
            Create Admin accounts and choose what each person can view or
            manage.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-action hover:bg-action-hover text-on-action rounded-lg text-xs font-semibold shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Admin
          </button>
        )}
      </div>

      {/* Admin Table */}
      <PlatformAdminTable
        admins={admins}
        loading={loading}
        onToggleStatus={handleToggleStatus}
        onSaved={loadAdmins}
      />
    </div>
  );
};
