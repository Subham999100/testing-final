// ============================================================
// Clyptus Job Portal - Reset Organisation Super Admin Password Modal
//
// Flow: Confirmation -> Reset API Call -> One-Time Credential Screen
// ============================================================

import React, { useState } from 'react';
import {
  KeyRound,
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { PlatformService } from '../../../services/platform.service';
import { OrganisationSuperAdminSummary } from '../../../types/platform.types';

interface Props {
  organisationId: string;
  organisationName: string;
  superAdmin: OrganisationSuperAdminSummary;
  onClose: () => void;
}

export const ResetSuperAdminPasswordModal: React.FC<Props> = ({
  organisationId,
  organisationName,
  superAdmin,
  onClose,
}) => {
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await PlatformService.resetSuperAdminPassword(organisationId);
      setTemporaryPassword(res.temporaryPassword);
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!temporaryPassword) return;
    navigator.clipboard.writeText(temporaryPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {step === 'confirm' ? 'Reset Super Admin Password?' : 'Password Reset Successfully'}
              </h3>
              <p className="text-[11px] text-slate-400">{organisationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {step === 'confirm' && (
            <>
              <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Super Admin:</span>
                  <span className="font-semibold text-white">{superAdmin.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <span className="font-mono text-slate-200">{superAdmin.email}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5 text-amber-300">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Important Notice</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-1 pl-1">
                  <li>A new temporary password will be generated.</li>
                  <li>The existing password will stop working immediately.</li>
                  <li>The new password will be shown only once.</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'success' && temporaryPassword && (
            <>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Password Reset Successfully</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Share the new temporary password with the Super Admin securely.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Super Admin:</span>
                  <span className="font-semibold text-white">{superAdmin.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <span className="font-mono text-slate-200">{superAdmin.email}</span>
                </div>
                <div className="pt-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 text-[11px]">New Temporary Password:</span>
                    {copied && (
                      <span className="text-[10px] text-emerald-400 font-medium animate-fade-in">
                        Temporary password copied.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-700">
                    <span className="font-mono font-bold text-violet-300 tracking-wider text-sm">
                      {showPassword ? temporaryPassword : '•'.repeat(temporaryPassword.length)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-colors border border-slate-700"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium">
                  ⚠️ This password is shown only once. Save it securely before closing this window.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
          {step === 'confirm' && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Generate New Password'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
