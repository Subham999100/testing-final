// ============================================================
// Clyptus Job Portal - Platform Admins Table Component
// Displays registered Platform Staff & RBAC permissions.
// Guarded by platform.admins.* permissions.
// ============================================================

import React from 'react';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { PlatformAdminUser } from '../../../types/platform.types';
import { usePermissions } from '../../../hooks/usePermissions';

interface Props {
  admins: PlatformAdminUser[];
  loading: boolean;
  onToggleStatus: (admin: PlatformAdminUser) => void;
}

export const PlatformAdminTable: React.FC<Props> = ({
  admins,
  loading,
  onToggleStatus,
}) => {
  const { hasPermission } = usePermissions();
  const canDisable = hasPermission('platform.admins.disable') || hasPermission('platform.admins.update');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Admin User</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned Permissions</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Loading platform administrators...
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No administrators registered.
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const isSuper = admin.role === 'PLATFORM_SUPER_ADMIN';

                return (
                  <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors font-sans">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSuper
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {admin.firstName[0]}
                          {admin.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">
                            {admin.firstName} {admin.lastName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {admin.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuper
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {admin.platformAdminProfile?.department || 'Operations'}
                    </td>
                    <td className="py-3.5 px-4">
                      {admin.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {isSuper ? (
                        <span className="text-slate-400 font-mono text-[10px]">
                          Root Super Admin (* Access)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(admin.platformAdminProfile?.permissions || []).map((perm, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700/60"
                            >
                              {perm.replace('platform.', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isSuper && canDisable && (
                        <button
                          onClick={() => onToggleStatus(admin)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                            admin.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/20'
                              : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                          }`}
                        >
                          {admin.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
