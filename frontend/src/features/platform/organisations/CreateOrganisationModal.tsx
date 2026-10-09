// ============================================================
// Clyptus Job Portal - Shared Create Organisation Modal
// Multi-step wizard:
// Step 1: Organisation Details
// Step 2: Initial Organisation Super Admin Provisioning
// ============================================================

import React, { useState } from 'react';
import { Building2, UserCheck, X, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';

export interface CreateOrganisationFormData {
  name: string;
  slug: string;
  domain: string;
  contactEmail: string;
  tier: string;
  industry: string;
  initialTokenAllocation: number;
  recruiterLimit: number;
  superAdminName: string;
  superAdminEmail: string;
  superAdminPassword: string;
  superAdminPasswordConfirmation: string;
}

interface Props {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateOrganisationFormData) => Promise<void> | void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;

export const CreateOrganisationModal: React.FC<Props> = ({
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<CreateOrganisationFormData>({
    name: '',
    slug: '',
    domain: '',
    contactEmail: '',
    tier: 'STANDARD',
    industry: 'Technology',
    initialTokenAllocation: 1000,
    recruiterLimit: 25,
    superAdminName: '',
    superAdminEmail: '',
    superAdminPassword: '',
    superAdminPasswordConfirmation: '',
  });

  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      setError('Organisation name is required');
      return false;
    }
    if (!formData.slug.trim()) {
      setError('URL slug is required');
      return false;
    }
    if (!SLUG_REGEX.test(formData.slug.trim())) {
      setError('Slug must consist only of lowercase letters, numbers, and hyphens');
      return false;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(formData.contactEmail.trim())) {
      setError('Please enter a valid contact email address');
      return false;
    }
    if (formData.initialTokenAllocation < 0 || isNaN(formData.initialTokenAllocation)) {
      setError('Initial token allocation must be 0 or greater');
      return false;
    }
    if (!formData.recruiterLimit || formData.recruiterLimit < 1) {
      setError('Recruiter limit must be at least 1');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.superAdminName.trim()) {
      setError('Super Admin full name is required');
      return false;
    }
    if (!formData.superAdminEmail.trim()) {
      setError('Super Admin email is required');
      return false;
    }
    if (!EMAIL_REGEX.test(formData.superAdminEmail.trim())) {
      setError('Please enter a valid Super Admin email address');
      return false;
    }
    if (!formData.superAdminPassword) {
      setError('Initial password is required');
      return false;
    }
    if (formData.superAdminPassword.length < 8) {
      setError('Initial password must be at least 8 characters long');
      return false;
    }
    if (!formData.superAdminPasswordConfirmation) {
      setError('Password confirmation is required');
      return false;
    }
    if (formData.superAdminPassword !== formData.superAdminPasswordConfirmation) {
      setError('Passwords do not match');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (step === 1) {
      handleNext();
      return;
    }

    if (validateStep2()) {
      try {
        await onSubmit(formData);
      } catch (err: any) {
        setError(err?.message || 'Failed to create organisation');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {step === 1 ? (
              <Building2 className="w-5 h-5 text-indigo-400" />
            ) : (
              <UserCheck className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <h3 className="text-base font-bold text-white">Create Tenant Organisation</h3>
              <p className="text-[11px] text-slate-400">
                {step === 1
                  ? 'Step 1 of 2: Organisation Details'
                  : 'Step 2 of 2: Organisation Super Admin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${
              step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          />
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${
              step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'
            }`}
          />
        </div>

        {/* Validation Error Banner */}
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Organisation Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Inc"
                    value={formData.name}
                    onChange={(e) => {
                      setError(null);
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">URL Slug (lowercase) *</label>
                  <input
                    type="text"
                    required
                    placeholder="acme-inc"
                    value={formData.slug}
                    onChange={(e) => {
                      setError(null);
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Domain</label>
                  <input
                    type="text"
                    placeholder="acme.com"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="hr@acme.com"
                    value={formData.contactEmail}
                    onChange={(e) => {
                      setError(null);
                      setFormData({ ...formData, contactEmail: e.target.value });
                    }}
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
                  <label className="text-slate-300 font-medium">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Technology"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Initial Token Allocation</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialTokenAllocation}
                    onChange={(e) => {
                      setError(null);
                      setFormData({
                        ...formData,
                        initialTokenAllocation: Number(e.target.value),
                      });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Recruiter Limit *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.recruiterLimit}
                    onChange={(e) => {
                      setError(null);
                      setFormData({
                        ...formData,
                        recruiterLimit: Number(e.target.value),
                      });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-slate-400 text-[11px] leading-relaxed">
                Provide credentials for the primary{' '}
                <span className="text-white font-semibold">Organisation Super Admin</span>. This
                user will have administrative authority to manage organization settings, recruiters,
                and hiring workflows.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={formData.superAdminName}
                    onChange={(e) => {
                      setError(null);
                      setFormData({ ...formData, superAdminName: e.target.value });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@acme.com"
                    value={formData.superAdminEmail}
                    onChange={(e) => {
                      setError(null);
                      setFormData({ ...formData, superAdminEmail: e.target.value });
                    }}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
                      placeholder="Min 8 characters"
                      value={formData.superAdminPassword}
                      onChange={(e) => {
                        setError(null);
                        setFormData({ ...formData, superAdminPassword: e.target.value });
                      }}
                      className="w-full p-2 pr-9 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={formData.superAdminPasswordConfirmation}
                      onChange={(e) => {
                        setError(null);
                        setFormData({
                          ...formData,
                          superAdminPasswordConfirmation: e.target.value,
                        });
                      }}
                      className="w-full p-2 pr-9 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Organisation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
