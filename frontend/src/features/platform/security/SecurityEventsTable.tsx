// ============================================================
// Clyptus Job Portal - Shared Security Events Table
// Displays security anomalies, severity ratings, and resolution state.
// Reusable by Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { SecurityEvent } from '../../../types/platform.types';
import { usePermissions } from '../../../hooks/usePermissions';

interface Props {
  events: SecurityEvent[];
  loading: boolean;
  onResolveClick: (ev: SecurityEvent) => void;
}

export const SecurityEventsTable: React.FC<Props> = ({
  events,
  loading,
  onResolveClick,
}) => {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('platform.security.manage');

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white">Security Event Feed</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Origin IP</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  Loading security feed...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  No security events recorded.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors font-sans">
                  <td className="py-3.5 px-4 font-mono font-bold text-white text-xs">
                    {ev.eventType}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        ev.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : ev.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{ev.ipAddress || 'Internal'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ev.isResolved
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {ev.isResolved ? 'Resolved' : 'Action Required'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {!ev.isResolved ? (
                      canManage ? (
                        <button
                          onClick={() => onResolveClick(ev)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">Pending Super Admin</span>
                      )
                    ) : (
                      <span className="text-slate-500 text-[11px] italic">Documented</span>
                    )}
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
