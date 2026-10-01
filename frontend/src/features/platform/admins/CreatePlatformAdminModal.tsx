// ============================================================
// Clyptus Job Portal - Create Platform Admin View
// Redesigned to match Assign Recruiter Roles SaaS design language.
// Renders as a full in-page permissions configuration view.
// ============================================================

import React, { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { PermissionMatrix } from "./PermissionMatrix";
export { AVAILABLE_PERMISSIONS } from "./permission-labels";

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

export const CreatePlatformAdminModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    department: "Operations",
    permissions: ["platform.organisations.read", "platform.audit.read"],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-md text-muted hover:text-ink hover:bg-soft transition-colors"
              title="Back to Platform Administrators"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold tracking-widest text-orange-600 uppercase">
              Access Control
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-sans mt-1">
            Create Platform Admin
          </h1>
          <p className="text-xs text-muted mt-1">
            Configure administrator credentials and fine-grained operational permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink bg-surface border border-line hover:bg-soft rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Creating Admin..." : "Save changes"}
          </button>
        </div>
      </div>

      {/* Main Page Card Container */}
      <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Admin Details Section */}
          <div className="space-y-4 pb-6 border-b border-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
              Admin Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="create-admin-firstName"
                  className="text-xs font-semibold text-ink"
                >
                  First Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="create-admin-firstName"
                  disabled={isSubmitting}
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Sarah"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-admin-lastName"
                  className="text-xs font-semibold text-ink"
                >
                  Last Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="create-admin-lastName"
                  disabled={isSubmitting}
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Connor"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="create-admin-email"
                  className="text-xs font-semibold text-ink"
                >
                  Work Email <span className="text-orange-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  id="create-admin-email"
                  disabled={isSubmitting}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="sarah.c@platform.clyptus.com"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono transition-all"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="create-admin-department"
                  className="text-xs font-semibold text-ink"
                >
                  Department
                </label>
                <input
                  type="text"
                  id="create-admin-department"
                  disabled={isSubmitting}
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="Operations"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1 sm:w-1/2 sm:pr-2">
              <label
                htmlFor="create-admin-password"
                className="text-xs font-semibold text-ink"
              >
                Initial Password <span className="text-orange-600">*</span>
              </label>
              <input
                type="password"
                required
                id="create-admin-password"
                disabled={isSubmitting}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-xs text-ink focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              />
            </div>
          </div>

          {/* Admin Permissions Matrix Section */}
          <PermissionMatrix
            selected={formData.permissions}
            onChange={(permissions) =>
              setFormData({ ...formData, permissions })
            }
            disabled={isSubmitting}
          />
        </form>

        {/* Bottom Action Footer */}
        <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Creating Admin..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

