// ============================================================
// Clyptus Job Portal - Platform Centralized Audit Logs
// Provides immutable traceability of all administrative actions.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  Search,
  Shield,
  Clock,
  User,
  Building,
  RefreshCw,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { AuditLogItem } from '../../types/platform.types';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = () => {
    setLoading(true);
    PlatformService.getAuditLogs({
      action: actionFilter || undefined,
    })
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Centralized Audit Logging</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable administrative event stream. Credentials and sensitive secrets are automatically redacted.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stream
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-400 font-medium">Filter Action:</span>
        <input
          type="text"
          placeholder="Filter by action (e.g. ORGANISATION_SUSPENDED, TOKEN_ADJUSTMENT)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* AUDIT TABLE */}
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
                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-bold text-indigo-400 block">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-sans">ID: {log.id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-medium text-slate-200 block">
                          {log.actor?.firstName ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-white font-semibold">{log.entityType}</span>
                      <span className="text-slate-500 block truncate max-w-[120px]">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {log.organisationName || log.organisationId || 'Platform-Wide'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {log.ipAddress || 'Internal'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono transition-colors"
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

      {/* METADATA INSPECT DRAWER / MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-mono">{selectedLog.action}</h3>
                <p className="text-xs text-slate-400">Audit Record #{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <span className="text-slate-400 block text-[11px]">Actor:</span>
                  <span className="text-white font-medium">{selectedLog.actorRole} ({selectedLog.actorId})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity:</span>
                  <span className="text-white font-medium">{selectedLog.entityType}:{selectedLog.entityId}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Sanitized Metadata:</span>
                <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-indigo-300 font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
