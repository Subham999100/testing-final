// ============================================================
// Clyptus Job Portal - Create Organisation Modal
//
// Flow: Organisation form + Super Admin details (with manual initial password)
//    -> Backend creates org + user transactionally
//    -> Success screen confirms configuration (no password redisplay)
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, X, CheckCircle2, AlertTriangle, Loader2,
  ArrowRight, ExternalLink, Eye, EyeOff, ShieldAlert, User, KeyRound,
} from 'lucide-react';
import { PlatformService } from '../../../services/platform.service';

interface FormData {
  name: string;
  slug: string;
  domain: string;
  contactEmail: string;
  tier: string;
  initialTokenAllocation: number;
  superAdminName: string;
  superAdminEmail: string;
  superAdminPassword: string;
  superAdminPasswordConfirmation: string;
}

interface CreatedResult {
  organisation: { id: string; name: string; slug: string; contactEmail: string; status: string; tier: string };
  superAdmin: { id: string; name: string; email: string; role: string };
}

interface Props {
  onClose: () => void;
  onOrganisationCreated: () => void;
}

export const CreateOrganisationModal: React.FC<Props> = ({ onClose, onOrganisationCreated }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    domain: '',
    contactEmail: '',
    tier: 'STANDARD',
    initialTokenAllocation: 1000,
    superAdminName: '',
    superAdminEmail: '',
    superAdminPassword: '',
    superAdminPasswordConfirmation: '',
  });

  const orgPortalUrl =
    (import.meta as any).env?.VITE_ORG_PORTAL_URL ||
    window.location.origin + '/org/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.superAdminPassword.length < 8) {
      setError('Initial password must be at least 8 characters long.');
      return;
    }

    if (formData.superAdminPassword !== formData.superAdminPasswordConfirmation) {
      setError('Initial password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await PlatformService.createOrganisation(formData);
      // Immediately purge plaintext password from component state
      setFormData({
        name: '',
        slug: '',
        domain: '',
        contactEmail: '',
        tier: 'STANDARD',
        initialTokenAllocation: 1000,
        superAdminName: '',
        superAdminEmail: '',
        superAdminPassword: '',
        superAdminPasswordConfirmation: '',
      });
      setResult(res);
      onOrganisationCreated();
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Failed to create organisation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              {step === 'form' ? 'Create Tenant Organisation' : 'Organisation Created Successfully'}
            </h3>
          </div>
          {step === 'done' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">

          {step === 'form' && (
            <form id="create-org-form" onSubmit={handleSubmit} className="space-y-5 text-xs">

              {/* Organisation details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Organisation Details
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="ABC Technologies"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">URL Slug *</label>
                    <input
                      type="text"
                      required
                      placeholder="abc-technologies"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Contact Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@abctech.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Domain</label>
                    <input
                      type="text"
                      placeholder="abctech.com"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Plan Tier</label>
                    <select
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STANDARD">Standard</option>
                      <option value="GROWTH">Growth</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Initial Tokens</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialTokenAllocation}
                      onChange={(e) => setFormData({ ...formData, initialTokenAllocation: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800" />

              {/* Super Admin section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-violet-400 font-semibold text-[11px] uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" /> Organisation Super Admin
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formData.superAdminName}
                      onChange={(e) => setFormData({ ...formData, superAdminName: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={formData.superAdminEmail}
                      onChange={(e) => setFormData({ ...formData, superAdminEmail: e.target.value })}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Initial Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={formData.superAdminPassword}
                        onChange={(e) => setFormData({ ...formData, superAdminPassword: e.target.value })}
                        className="w-full p-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Confirm Initial Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={formData.superAdminPasswordConfirmation}
                        onChange={(e) => setFormData({ ...formData, superAdminPasswordConfirmation: e.target.value })}
                        className="w-full p-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-slate-500 text-[10px]">
                  Choose a secure initial password (min 8 characters). The Super Admin will be required to change this on their first login.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-rose-300">{error}</p>
                </div>
              )}
            </form>
          )}

          {/* ---- Success Screen ---- */}
          {step === 'done' && result && (
            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-300 font-semibold">Organisation Created Successfully</p>
                  <p className="text-slate-400 mt-0.5">The tenant and super admin account are active.</p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-slate-700 divide-y divide-slate-700">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Organisation</p>
                    <p className="text-white font-semibold mt-0.5 text-sm">{result.organisation.name}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                    {result.organisation.status}
                  </span>
                </div>

                <div className="px-4 py-3 space-y-3">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Organisation Super Admin</p>
                    <p className="text-white font-medium mt-0.5">{result.superAdmin.name}</p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Email</p>
                    <p className="text-white font-mono mt-0.5">{result.superAdmin.email}</p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider">Initial Password</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-emerald-400 font-medium">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Successfully configured</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="font-semibold text-amber-200">
                    ⚠️ The password you entered will be required for the Super Admin's first login.
                  </p>
                  <p className="text-amber-300/90">
                    The Super Admin will be required to change this password after the first login.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex items-center justify-end gap-3">
          {step === 'form' && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-org-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
                ) : (
                  <>Create Organisation + Super Admin <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </>
          )}
          {step === 'done' && result && (
            <>
              <a
                href={orgPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Organisation Portal
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                Done
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
