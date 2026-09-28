// ============================================================
// Clyptus Job Portal - Create Platform Admin Modal
// Enforces granular permission assignment for platform admins.
// Strictly prevents elevation to PLATFORM_SUPER_ADMIN.
// ============================================================

import React, { useState } from 'react';
import { X, Users2, Shield } from 'lucide-react';

export const AVAILABLE_PERMISSIONS = [
  { key: 'platform.organisations.read', label: 'View Organisations' },
  { key: 'platform.organisations.update', label: 'Update Organisations' },
  { key: 'platform.organisations.suspend', label: 'Suspend / Activate Organisations' },
  { key: 'platform.tokens.read', label: 'View Token Ledger' },
  { key: 'platform.tokens.manage', label: 'Manage Token Plans' },
  { key: 'platform.tokens.adjust', label: 'Adjust Organisation Tokens' },
  { key: 'platform.analytics.read', label: 'View Platform Analytics' },
  { key: 'platform.audit.read', label: 'Read Central Audit Logs' },
  { key: 'platform.security.read', label: 'View Security Events' },
];

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
    permissions: ['platform.organisations.read', 'platform.audit.read'],
  });

  if (!isOpen) return null;

  const togglePermission = (key: string) => {
    if (formData.permissions.includes(key)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== key),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, key],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Create Platform Admin Account</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Sarah"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Connor"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Work Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="sarah.c@platform.clyptus.com"
              className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Initial Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Operations"
                className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200">
                Grant Explicit RBAC Permissions
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {formData.permissions.length} selected
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = formData.permissions.includes(perm.key);
                return (
                  <label
                    key={perm.key}
                    onClick={() => togglePermission(perm.key)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-medium block">{perm.label}</span>
                      <span className="text-[10px] font-mono text-slate-500">{perm.key}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </label>
                );
              })}
            </div>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Admin...' : 'Create Platform Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
