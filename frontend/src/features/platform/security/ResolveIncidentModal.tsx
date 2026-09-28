// ============================================================
// Clyptus Job Portal - Shared Resolve Incident Modal
// Captures mandatory remediation notes for security mitigation.
// ============================================================

import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { SecurityEvent } from '../../../types/platform.types';

interface Props {
  event: SecurityEvent | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<void>;
}

export const ResolveIncidentModal: React.FC<Props> = ({
  event,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('');

  if (!event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolutionNotes.trim().length < 5) return;
    onSubmit(resolutionNotes.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Resolve Security Incident</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-lg text-xs space-y-1">
          <span className="text-slate-400 block text-[11px]">Incident:</span>
          <span className="font-mono text-rose-400 font-bold">{event.eventType}</span>
          <span className="text-slate-400 block font-mono">From IP: {event.ipAddress || 'Internal'}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Remediation Notes *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain actions taken to mitigate threat..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || resolutionNotes.trim().length < 5}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
