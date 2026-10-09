// ============================================================
// Clyptus Job Portal - Create Platform Admin Modal
// Modal dialog allowing Super Admin to create a new admin.
// Includes password eye icon toggle and inline validation.
// ============================================================

import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff, X, Save, AlertCircle, ShieldCheck } from 'lucide-react';
import { AVAILABLE_PERMISSIONS, permissionGroups } from './permission-labels';

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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: 'Operations',
    permissions: [
      'platform.organisations.read',
      'platform.organisations.verify',
      'platform.audit.read',
      'platform.support.read',
    ],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (formData.password.length < 8) {
      setFormError('Initial password must be at least 8 characters long');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create platform administrator');
    }
  };

  const handleTogglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: select ? AVAILABLE_PERMISSIONS.map((p) => p.key) : [],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between shrink-0 bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Create Platform Administrator</h2>
              <p className="text-xs text-muted">
                Add an administrator account and assign initial operational permissions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-muted hover:text-ink hover:bg-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Administrator Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  First Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="e.g. David"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  Last Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="e.g. Miller"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  Work Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. david.m@clyptus.platform"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-ink font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Department</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Operations, Security, Support"
                  className="w-full px-3.5 py-2 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Password input with Eye toggle */}
            <div className="space-y-1">
              <label className="font-semibold text-ink">
                Initial Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full pl-3.5 pr-10 py-2 bg-surface border border-line-strong rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted">
                The administrator can use this password to log in. You can also reset it anytime later.
              </p>
            </div>
          </div>

          {/* Initial Permissions Checklist */}
          <div className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Initial Permissions ({formData.permissions.length} selected)
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  You can fine-tune all permissions in the Feature Matrix after creation.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  Select All
                </button>
                <span className="text-muted">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="font-semibold text-rose-700 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-soft/50 rounded-xl border border-line">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = formData.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-surface cursor-pointer select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(perm.key)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-ink block text-[11px]">{perm.label}</span>
                      <span className="text-[9px] font-mono text-muted block">{perm.key}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-soft rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Creating Admin...' : 'Create Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
