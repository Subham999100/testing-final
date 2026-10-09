// ============================================================
// Clyptus Job Portal - Platform Admin Table (Admin Directory)
// Lists registered administrators with compact assigned permissions,
// inline permission expander, Reset Password, and direct Feature Matrix navigation.
// ============================================================

import React, { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Key, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { PlatformAdminUser } from '../../../types/platform.types';
import { usePermissions } from '../../../hooks/usePermissions';
import { ResetAdminPasswordModal } from './ResetAdminPasswordModal';

interface Props {
  admins: PlatformAdminUser[];
  loading: boolean;
  onToggleStatus: (admin: PlatformAdminUser) => void;
  onSaved: () => void;
  onEditPermissions: (adminId: string) => void;
}

export const PlatformAdminTable: React.FC<Props> = ({
  admins,
  loading,
  onToggleStatus,
  onSaved,
  onEditPermissions,
}) => {
  const { hasPermission } = usePermissions();
  const canDisable = hasPermission('platform.admins.disable') || hasPermission('platform.admins.update');

  const [expandedAdminIds, setExpandedAdminIds] = useState<string[]>([]);
  const [resetAdmin, setResetAdmin] = useState<PlatformAdminUser | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedAdminIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-soft text-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">Admin User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 min-w-[220px]">Assigned Permissions</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted font-sans">
                    Loading platform administrators...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted font-sans">
                    No administrators registered.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isSuper = admin.role === 'PLATFORM_SUPER_ADMIN';
                  const permissions = admin.platformAdminProfile?.permissions || [];
                  const isExpanded = expandedAdminIds.includes(admin.id);
                  const firstPerm = permissions[0];
                  const remainingCount = permissions.length - 1;

                  return (
                    <tr key={admin.id} className="hover:bg-soft transition-colors font-sans">
                      {/* Admin User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSuper
                                ? 'bg-danger-soft text-danger border border-danger'
                                : 'bg-brand-soft text-action border border-brand'
                            }`}
                          >
                            {admin.firstName[0]}
                            {admin.lastName[0]}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-ink block">
                              {admin.firstName} {admin.lastName}
                            </span>
                            <span className="text-[11px] text-muted font-mono block truncate">
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuper
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {admin.role}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-ink">
                        {admin.platformAdminProfile?.department || (isSuper ? 'Governance' : 'Operations')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {admin.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Assigned Permissions: One permission + Clickable count badge */}
                      <td className="py-3.5 px-4">
                        {isSuper ? (
                          <span className="text-muted font-mono text-[10px]">
                            Root Super Admin (* Access)
                          </span>
                        ) : permissions.length === 0 ? (
                          <span className="text-muted italic text-[11px]">No permissions assigned</span>
                        ) : !isExpanded ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-soft text-ink font-mono text-[10px] border border-line-strong font-medium">
                              {firstPerm.replace('platform.', '')}
                            </span>
                            {remainingCount > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(admin.id)}
                                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-mono text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                                title="Click to view all assigned permissions"
                              >
                                <span>+{remainingCount} more</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 animate-in fade-in">
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-soft/60 border border-line">
                              {permissions.map((perm, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-surface text-ink font-mono text-[9px] border border-line-strong shadow-2xs"
                                >
                                  {perm.replace('platform.', '')}
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleExpand(admin.id)}
                              className="text-[10px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Show less</span>
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-muted text-[11px] whitespace-nowrap">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isSuper && (
                            <>
                              {/* Edit Permissions -> switches directly to Feature Matrix tab */}
                              <button
                                type="button"
                                onClick={() => onEditPermissions(admin.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-soft text-ink transition-colors cursor-pointer shadow-2xs"
                                title="Open this administrator in the Feature Matrix"
                              >
                                <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                                Edit Permissions
                              </button>

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => setResetAdmin(admin)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-amber-50 hover:text-amber-800 text-ink transition-colors cursor-pointer shadow-2xs"
                                title="Reset administrator password"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-500" />
                                Reset Password
                              </button>
                            </>
                          )}

                          {!isSuper && canDisable && (
                            <button
                              type="button"
                              onClick={() => onToggleStatus(admin)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                admin.isActive
                                  ? 'text-danger hover:bg-danger-soft border-danger'
                                  : 'text-success hover:bg-success-soft border-success'
                              }`}
                            >
                              {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Admin Password Modal */}
      {resetAdmin && (
        <ResetAdminPasswordModal
          admin={resetAdmin}
          isOpen={!!resetAdmin}
          onClose={() => setResetAdmin(null)}
          onSuccess={onSaved}
        />
      )}
    </>
  );
};
