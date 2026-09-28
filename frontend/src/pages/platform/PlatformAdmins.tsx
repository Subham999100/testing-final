// ============================================================
// Clyptus Job Portal - Platform Admin Management View
// Allows Platform Super Admin to create, oversee, and revoke
// Platform Admins with fine-grained permissions.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  KeyRound,
  X,
  Lock,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { PlatformAdminUser } from '../../types/platform.types';

const AVAILABLE_PERMISSIONS = [
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

export const PlatformAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: 'Operations',
    permissions: ['platform.organisations.read', 'platform.audit.read'],
  });

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
    if (confirm(`Set status for ${admin.firstName} ${admin.lastName} to ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}?`)) {
      try {
        await PlatformService.toggleAdminStatus(admin.id, newStatus);
        loadAdmins();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await PlatformService.createAdmin(formData);
      setShowCreateModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        department: 'Operations',
        permissions: ['platform.organisations.read', 'platform.audit.read'],
      });
      loadAdmins();
    } catch (err: any) {
      alert(`Error creating admin: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Admin Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Delegate platform administration and enforce the principle of least privilege.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Platform Admin
        </button>
      </div>

      {/* SECURITY NOTICE BANNER */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-indigo-300 block">Strict Privilege Isolation Enforced</span>
          <p className="text-indigo-200/80 mt-0.5">
            Platform Admins operate strictly under delegated permissions. A Platform Admin can{' '}
            <strong className="text-white">NEVER</strong> create, elevate, or modify a Platform Super Admin account.
            All administrative actions are captured into immutable audit logs.
          </p>
        </div>
      </div>

      {/* ADMINS LIST */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Assigned Permissions</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading platform administrators...
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block text-sm">
                          {adm.firstName} {adm.lastName}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">{adm.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          adm.role === 'PLATFORM_SUPER_ADMIN'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                            : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {adm.role === 'PLATFORM_SUPER_ADMIN' && <Lock className="w-3 h-3" />}
                        {adm.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {adm.platformAdminProfile?.department || 'Platform Engineering'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {adm.role === 'PLATFORM_SUPER_ADMIN' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                            ALL PERMISSIONS (*)
                          </span>
                        ) : (
                          adm.platformAdminProfile?.permissions?.map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px]"
                            >
                              {p.replace('platform.', '')}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          adm.isActive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {adm.isActive ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {adm.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {adm.role !== 'PLATFORM_SUPER_ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(adm)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            adm.isActive
                              ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {adm.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Create Platform Admin</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Platform Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@clyptus.platform"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Temporary Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              {/* PERMISSION CHECKBOXES */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-slate-300 font-semibold block">
                  Assign Fine-Grained Permissions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.key)}
                        onChange={() => togglePermission(perm.key)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-300 text-[11px]">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
