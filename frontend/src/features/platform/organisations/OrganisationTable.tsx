// ============================================================
// Clyptus Job Portal - Shared Organisation Table
// Reusable by both Platform Super Admin & Platform Admin.
// Row action buttons are permission-controlled.
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Users } from 'lucide-react';
import { Organisation } from '../../../types/platform.types';
import { OrganisationStatusBadge } from './OrganisationStatusBadge';
import { usePermissions } from '../../../hooks/usePermissions';

interface Props {
  organisations: Organisation[];
  loading: boolean;
  onSuspendClick: (org: Organisation) => void;
  onActivateClick: (org: Organisation) => void;
}

export const OrganisationTable: React.FC<Props> = ({
  organisations,
  loading,
  onSuspendClick,
  onActivateClick,
}) => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const canSuspend = hasPermission('platform.organisations.suspend');
  const canRead = hasPermission('platform.organisations.read');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Organisation</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Tier</th>
              <th className="py-3 px-4">Members</th>
              <th className="py-3 px-4">Token Balance</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  Loading organisations...
                </td>
              </tr>
            ) : organisations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No organisations found matching the current criteria.
                </td>
              </tr>
            ) : (
              organisations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-semibold text-white block text-sm">{org.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px] font-mono">
                        <span>{org.slug}</span>
                        {org.domain && <span>· {org.domain}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <OrganisationStatusBadge status={org.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {org.tier}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{org.membersCount}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono">
                      <span className="font-bold text-emerald-400">{org.tokenBalance}</span>
                      <span className="text-slate-400 text-[10px] block">
                        Used: {org.consumedTokens}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canRead && (
                        <button
                          onClick={() => navigate(`/platform/organisations/${org.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {canSuspend && org.status === 'ACTIVE' && (
                        <button
                          onClick={() => onSuspendClick(org)}
                          className="px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded text-[11px] font-semibold transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                      {canSuspend && org.status === 'SUSPENDED' && (
                        <button
                          onClick={() => onActivateClick(org)}
                          className="px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] font-semibold transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
