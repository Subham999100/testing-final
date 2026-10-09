// ============================================================
// Clyptus Job Portal - Shared Audit Inspect Modal
// Displays sanitized payload and execution metadata.
// Reusable across platform audit views.
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import { AuditLogItem } from '../../../types/platform.types';

interface Props {
  log: AuditLogItem | null;
  onClose: () => void;
}

export const AuditInspectModal: React.FC<Props> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white font-mono">{log.action}</h3>
            <p className="text-xs text-slate-400">Audit Record #{log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/50 rounded-lg">
            <div>
              <span className="text-slate-400 block text-[11px]">Actor:</span>
              <span className="text-white font-medium">
                {log.actorRole} ({log.actor?.email || log.actorId})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Entity:</span>
              <span className="text-white font-medium">
                {log.entityType}:{log.entityId}
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block font-semibold mb-1">Sanitized Metadata:</span>
            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-indigo-300 font-mono text-[11px] overflow-x-auto max-h-56">
              {JSON.stringify(log.metadata || {}, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
