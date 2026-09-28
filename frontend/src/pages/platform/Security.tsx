// ============================================================
// Clyptus Job Portal - Platform Security & Incident Governance
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { SecurityEvent } from '../../types/platform.types';

export const Security: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEvents = () => {
    setLoading(true);
    PlatformService.getSecurityEvents()
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || resolutionNotes.trim().length < 5) return;
    setIsSubmitting(true);
    try {
      await PlatformService.resolveSecurityEvent(selectedEvent.id, resolutionNotes.trim());
      setSelectedEvent(null);
      setResolutionNotes('');
      loadEvents();
    } catch (err: any) {
      alert(`Failed to resolve incident: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Incident Response</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time anomaly detection, threat mitigation, and session governance.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>MFA Enforced Globally</span>
        </div>
      </div>

      {/* SECURITY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Security Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-white font-mono">{events.length}</div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Open Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-400 font-mono">
            {events.filter((e) => !e.isResolved).length}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Resolved Incidents</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
            {events.filter((e) => e.isResolved).length}
          </div>
        </div>
      </div>

      {/* SECURITY EVENTS TABLE */}
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
                        <button
                          onClick={() => {
                            setSelectedEvent(ev);
                            setResolutionNotes('');
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          Resolve
                        </button>
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

      {/* RESOLUTION MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Resolve Security Incident</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-lg text-xs space-y-1">
              <span className="text-slate-400 block text-[11px]">Incident:</span>
              <span className="font-mono text-rose-400 font-bold">{selectedEvent.eventType}</span>
              <span className="text-slate-400 block font-mono">From IP: {selectedEvent.ipAddress}</span>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Resolution Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain actions taken to mitigate threat..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || resolutionNotes.trim().length < 5}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
