// ============================================================
// Clyptus Job Portal - Platform Admin Management View
// Allows Platform Super Admin to create, oversee, and revoke
// Platform Admins with fine-grained permissions.
// Guarded by platform.admins.* permissions.
// ============================================================

import React, { useState, useEffect } from "react";
import { Plus, Table as TableIcon, Users, Shield } from "lucide-react";
import { PlatformService } from "../../services/platform.service";
import { PlatformAdminUser } from "../../types/platform.types";
import { usePermissions } from "../../hooks/usePermissions";
import { PlatformAdminTable } from "../../features/platform/admins/PlatformAdminTable";
import { CreatePlatformAdminModal } from "../../features/platform/admins/CreatePlatformAdminModal";
import { FeatureMatrix } from "../../features/platform/admins/FeatureMatrix";
import { ErrorBox } from "../../components/platform/OperationsUI";

export const PlatformAdmins: React.FC = () => {
  const [loadError, setLoadError] = useState<any>(null);
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("platform.admins.create");

  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"directory" | "matrix">("directory");
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

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
      alert("Platform Super Admin status cannot be toggled here for root protection.");
      return;
    }
    const newStatus = !admin.isActive;
    if (
      confirm(
        `Set status for ${admin.firstName} ${admin.lastName} to ${
          newStatus ? "ACTIVE" : "DEACTIVATED"
        }?`
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

  const handleEditPermissions = (adminId: string) => {
    setSelectedAdminId(adminId);
    setActiveTab("matrix");
  };

  const platformAdminsCount = admins.filter((a) => a.role === "PLATFORM_ADMIN").length;

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
      {loadError && <ErrorBox error={loadError} retry={loadAdmins} />}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Platform Administrators
          </h1>
          <p className="text-xs text-muted mt-1">
            Configure individual administrator roles and fine-grained feature access across the platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Admin
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher: Admin Accounts Directory (Tab 1) vs Feature Matrix (Tab 2) */}
      <div className="flex items-center justify-between gap-4 border-b border-line pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "directory"
                ? "bg-surface border border-line-strong text-ink shadow-2xs"
                : "text-muted hover:text-ink hover:bg-soft"
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === "directory" ? "text-emerald-600" : "text-muted"}`} />
            <span>Admin Directory</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
              {admins.length} total
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "matrix"
                ? "bg-surface border border-line-strong text-ink shadow-2xs"
                : "text-muted hover:text-ink hover:bg-soft"
            }`}
          >
            <TableIcon className={`w-4 h-4 ${activeTab === "matrix" ? "text-emerald-600" : "text-muted"}`} />
            <span>Feature Matrix</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
              {platformAdminsCount} admins
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Admin Accounts Directory Table */}
      {activeTab === "directory" && (
        <PlatformAdminTable
          admins={admins}
          loading={loading}
          onToggleStatus={handleToggleStatus}
          onSaved={loadAdmins}
          onEditPermissions={handleEditPermissions}
        />
      )}

      {/* Tab 2: Feature Matrix RBAC Table */}
      {activeTab === "matrix" && (
        <FeatureMatrix
          admins={admins}
          onSaved={loadAdmins}
          highlightAdminId={selectedAdminId}
        />
      )}

      {/* Create Admin Modal */}
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
