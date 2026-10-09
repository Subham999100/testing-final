// ============================================================
// Transfer Organisation Super Admin Modal
// Allows Platform Super Admin / Admin to change the credentials
// of an existing Organisation Super Admin while preserving
// the exact same User ID, organisation association, and all tenant data.
// ============================================================

import React, { useState } from 'react';
import { Eye, EyeOff, X, Building2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export interface TransferSuperAdminModalProps {
  organisation: {
    id: string;
    name: string;
    superAdmin?: {
      id: string;
      email: string;
      name?: string;
    } | null;
  };
  onClose: () => void;
  onSuccess: () => void;
  onSubmitTransfer: (orgId: string, payload: { newEmail: string; newPassword: string; confirmPassword: string }) => Promise<any>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TransferSuperAdminModal: React.FC<TransferSuperAdminModalProps> = ({
  organisation,
  onClose,
  onSuccess,
  onSubmitTransfer,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const currentEmail = organisation.superAdmin?.email || 'No email configured';

  const validate = (): boolean => {
    setError(null);
    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setError('New email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid new email address');
      return false;
    }
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return false;
    }
    if (!confirmPassword) {
      setError('Please confirm the new password');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitTransfer(organisation.id, {
        newEmail: newEmail.trim().toLowerCase(),
        newPassword,
        confirmPassword,
      });
      setSuccessNotice('Organisation Super Admin credentials updated successfully.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to transfer Organisation Super Admin credentials';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="transfer-modal-title" className="text-sm font-semibold text-white">
                Transfer Organisation Super Admin
              </h2>
              <p className="text-[11px] text-slate-400">
                Update login credentials for {organisation.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div role="status" className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-slate-400 text-[11px] leading-relaxed">
            Changing these credentials will update the existing Super Admin account for{' '}
            <span className="text-white font-semibold">{organisation.name}</span>. All existing
            organisation jobs, recruiters, candidates, and settings remain untouched. Previous active sessions
            for the old credentials will be immediately invalidated.
          </div>

          {/* Organisation (Read-only) */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Organisation</label>
            <input
              type="text"
              readOnly
              disabled
              value={organisation.name}
              className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed select-none"
            />
          </div>

          {/* Current Email (Read-only) */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Current Email</label>
            <input
              type="text"
              readOnly
              disabled
              value={currentEmail}
              aria-label="Current Email"
              className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed select-none"
            />
          </div>

          {/* New Email */}
          <div className="space-y-1">
            <label htmlFor="new-admin-email" className="text-slate-300 font-medium">
              New Email *
            </label>
            <input
              id="new-admin-email"
              type="email"
              required
              autoFocus
              placeholder="newadmin@acme.com"
              value={newEmail}
              onChange={(e) => {
                setError(null);
                setNewEmail(e.target.value);
              }}
              disabled={isSubmitting}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label htmlFor="new-admin-password" className="text-slate-300 font-medium">
              New Password *
            </label>
            <div className="relative flex items-center">
              <input
                id="new-admin-password"
                type={showNewPassword ? 'text' : 'password'}
                required
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setError(null);
                  setNewPassword(e.target.value);
                }}
                disabled={isSubmitting}
                className="w-full p-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label htmlFor="confirm-admin-password" className="text-slate-300 font-medium">
              Confirm Password *
            </label>
            <div className="relative flex items-center">
              <input
                id="confirm-admin-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => {
                  setError(null);
                  setConfirmPassword(e.target.value);
                }}
                disabled={isSubmitting}
                className="w-full p-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
