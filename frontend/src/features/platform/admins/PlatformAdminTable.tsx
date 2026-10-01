import React from 'react';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { PlatformAdminUser } from '../../../types/platform.types';
import { usePermissions } from '../../../hooks/usePermissions';
import { AdminPermissions } from './AdminPermissions';

interface Props {
  admins: PlatformAdminUser[];
  loading: boolean;
  onToggleStatus: (admin: PlatformAdminUser) => void;
  onSaved: () => void;
}

export const PlatformAdminTable: React.FC<Props> = ({
  admins,
  loading,
  onToggleStatus,
  onSaved,
}) => {
  const { hasPermission } = usePermissions();
  const canDisable = hasPermission('platform.admins.disable') || hasPermission('platform.admins.update');

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-ink">
          <thead className="bg-soft text-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line">
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

                return (
                  <tr key={admin.id} className="hover:bg-soft transition-colors font-sans">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSuper
                              ? 'bg-danger-soft text-danger border border-danger'
                              : 'bg-brand-soft text-action border border-brand'
                          }`}
                        >
                          {admin.firstName[0]}
                          {admin.lastName[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-ink block">
                            {admin.firstName} {admin.lastName}
                          </span>
                          <span className="text-[11px] text-muted font-mono block">
                            {admin.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuper
                            ? 'bg-danger-soft text-danger border border-danger'
                            : 'bg-brand-soft text-action border border-brand'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-ink">
                      {admin.platformAdminProfile?.department || 'Operations'}
                    </td>
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
                    <td className="py-3.5 px-4 max-w-xs">
                      {isSuper ? (
                        <span className="text-muted font-mono text-[10px]">
                          Root Super Admin (* Access)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(admin.platformAdminProfile?.permissions || []).map((perm, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-soft text-ink font-mono text-[9px] border border-line-strong"
                            >
                              {perm.replace('platform.', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted text-[11px]">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isSuper && (
                          <AdminPermissions admin={admin} onSaved={onSaved} />
                        )}
                        {!isSuper && canDisable && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(admin)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
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
  );
};
