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
    <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-none">
      <div className="p-4 border-b border-line">
        <h3 className="text-sm font-bold text-ink">Security Event Feed</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-ink">
          <thead className="bg-soft text-muted uppercase text-[10px] tracking-wider font-semibold border-b border-line">
            <tr>
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Origin IP</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted font-sans">
                  Loading security feed...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted font-sans">
                  No security events recorded.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-soft transition-colors font-sans">
                  <td className="py-3.5 px-4 font-mono font-bold text-ink text-xs">
                    {ev.eventType}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        ev.severity === 'CRITICAL'
                          ? 'bg-danger-soft text-danger border border-danger'
                          : ev.severity === 'HIGH'
                          ? 'bg-warning-soft text-warning border border-warning'
                          : 'bg-brand-soft text-action'
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted">{ev.ipAddress || 'Internal'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        ev.isResolved
                          ? 'bg-success-soft text-success'
                          : 'bg-danger-soft text-danger'
                      }`}
                    >
                      {ev.isResolved ? 'Resolved' : 'Action Required'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {!ev.isResolved ? (
                      canManage ? (
                        <button
                          onClick={() => onResolveClick(ev)}
                          className="px-2.5 py-1 rounded bg-action hover:bg-action-hover text-on-action text-xs font-semibold"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-muted text-[11px] italic">Pending Super Admin</span>
                      )
                    ) : (
                      <span className="text-muted text-[11px] italic">Documented</span>
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
