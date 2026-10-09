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
    <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-xl p-6 shadow-none space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-warning" />
            <h3 className="text-base font-bold text-ink">Resolve Security Incident</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-soft rounded-lg text-xs space-y-1">
          <span className="text-muted block text-[11px]">Incident:</span>
          <span className="font-mono text-danger font-bold">{event.eventType}</span>
          <span className="text-muted block font-mono">From IP: {event.ipAddress || 'Internal'}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-ink font-medium">Remediation Notes *</label>
            <textarea
              rows={3}
              required
              placeholder="Explain actions taken to mitigate threat..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full p-2.5 bg-soft border border-line-strong rounded-lg text-ink placeholder-muted focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-line-strong text-ink hover:bg-soft"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || resolutionNotes.trim().length < 5}
              className="px-4 py-1.5 rounded-lg bg-action hover:bg-action-hover text-on-action font-semibold shadow-none  transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
