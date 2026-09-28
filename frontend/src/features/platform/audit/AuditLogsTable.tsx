// ============================================================
// Clyptus Job Portal - Shared Audit Logs Table
// Displays centralized audit records across tenant operations.
// Reusable by Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { Shield, Clock, User, Building } from 'lucide-react';
import { AuditLogItem } from '../../../types/platform.types';

interface Props {
  logs: AuditLogItem[];
  loading: boolean;
  onInspect: (log: AuditLogItem) => void;
}

export const AuditLogsTable: React.FC<Props> = ({ logs, loading, onInspect }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Action Event</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Organisation</th>
              <th className="py-3 px-4">Client IP</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading audit stream...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No audit records matching query.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-indigo-400 text-xs">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-white truncate max-w-[140px]">
                        {log.actor?.email || log.actorId}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    <span className="text-slate-400">{log.entityType}</span>
                    {log.entityId && (
                      <span className="block text-[10px] text-slate-500 truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {log.organisationId ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[120px]">{log.organisationId}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[10px] italic">Global / Platform</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onInspect(log)}
                      className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-mono transition-colors"
                    >
                      Inspect
                    </button>
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
