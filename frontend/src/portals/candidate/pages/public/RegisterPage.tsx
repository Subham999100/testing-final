// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: RegisterPage (Candidate Registration with Strong Password & Resume Onboarding)
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCandidateAuth } from '../../lib/session';
import { Button, Input, Field } from '@/portals/org/ui/ui';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useCandidateAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nextUrl = new URLSearchParams(location.search).get('next') || (location.state as any)?.from || '/candidate/dashboard';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibleToRecruiters, setVisibleToRecruiters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic password validation checks
  const hasMinLength = form.password.length >= 8;
  const hasUpper = /[A-Z]/.test(form.password);
  const hasNumber = /\d/.test(form.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password);
  const passwordsMatch = form.password.length > 0 && form.password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements before proceeding.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        visibleToRecruiters,
      });
      // Route new candidate directly to resume upload onboarding
      navigate(`/candidate/resume?next=${encodeURIComponent(nextUrl)}&onboarding=true`, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to create candidate account. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-sm">
            C
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create Candidate Account</h2>
          <p className="text-sm text-slate-500 mt-1">Start applying to verified career opportunities</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <Input
                type="text"
                required
                value={form.firstName}
                onChange={(e: any) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Jane"
              />
            </Field>

            <Field label="Last Name">
              <Input
                type="text"
                required
                value={form.lastName}
                onChange={(e: any) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Doe"
              />
            </Field>
          </div>

          <Field label="Email Address">
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e: any) => setForm({ ...form, email: e.target.value })}
              placeholder="jane.doe@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Phone (Optional)">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              required
              value={form.password}
              onChange={(e: any) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>

          {/* Real-time Password Requirements Checklist */}
          {form.password.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
              <div className="flex items-center gap-1.5">
                {hasMinLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUpper ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className={hasUpper ? 'text-emerald-700 font-medium' : ''}>At least 1 uppercase letter (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasNumber ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className={hasNumber ? 'text-emerald-700 font-medium' : ''}>At least 1 number (0-9)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasSpecial ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className={hasSpecial ? 'text-emerald-700 font-medium' : ''}>At least 1 special character (!@#$...)</span>
              </div>
            </div>
          )}

          <Field label="Confirm Password">
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e: any) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-600 -mt-2">Passwords do not match</p>
          )}

          {/* Global Talent Discovery Opt-in */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <p className="font-semibold text-slate-800">Let recruiters find you?</p>
            <p className="text-slate-500 leading-relaxed">
              Allow verified hiring teams to discover your profile in the global talent pool. Your email, phone, and resume remain private until unlocked.
            </p>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="visibleToRecruiters"
                  checked={visibleToRecruiters === true}
                  onChange={() => setVisibleToRecruiters(true)}
                  className="text-orange-600 focus:ring-orange-500"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="visibleToRecruiters"
                  checked={visibleToRecruiters === false}
                  onChange={() => setVisibleToRecruiters(false)}
                  className="text-orange-600 focus:ring-orange-500"
                />
                No (Default)
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-sm"
              disabled={loading || !isPasswordValid || !passwordsMatch}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to={nextUrl && nextUrl !== '/candidate/dashboard' ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'}
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
