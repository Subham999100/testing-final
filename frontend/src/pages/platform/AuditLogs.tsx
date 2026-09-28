// ============================================================
// Clyptus Job Portal - Platform Centralized Audit Logs
// Unified View for Platform Roles.
// Utilizes shared AuditLogsTable & AuditInspectModal.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { AuditLogItem } from '../../types/platform.types';
import { AuditLogsTable } from '../../features/platform/audit/AuditLogsTable';
import { AuditInspectModal } from '../../features/platform/audit/AuditInspectModal';

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

      {/* Shared Reusable AUDIT TABLE */}
      <AuditLogsTable
        logs={logs}
        loading={loading}
        onInspect={(log) => setSelectedLog(log)}
      />

      {/* Shared Reusable METADATA INSPECT MODAL */}
      <AuditInspectModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
