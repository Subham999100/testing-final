// ============================================================
// Clyptus Job Portal - Shared Suspend Organisation Modal
// Enforces mandatory justification for compliance audit logging.
// ============================================================

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Organisation } from '../../../types/platform.types';

interface Props {
  org: Organisation;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const SuspendOrganisationModal: React.FC<Props> = ({
  org,
  reason,
  isSubmitting,
  onReasonChange,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-rose-900/40 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Suspend Organisation</h3>
            <p className="text-xs text-slate-400">Mandatory compliance justification required</p>
          </div>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
          <span className="text-slate-400 block text-[11px]">Target Organisation:</span>
          <span className="font-semibold text-white text-sm">{org.name}</span>
          <span className="text-slate-500 block font-mono text-[11px] mt-0.5">
            ID: {org.id}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            Formal Suspension Reason <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Detail policy breach, non-payment, or security concern (min 10 characters)..."
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          <span className="text-[10px] text-slate-400 block">
            This action is audited permanently with your administrative identity.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={reason.trim().length < 10 || isSubmitting}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
          >
            {isSubmitting ? 'Recording Audit...' : 'Confirm Suspension'}
          </button>
        </div>
      </div>
    </div>
  );
};
