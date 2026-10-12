// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: LoginPage (Candidate Authentication)
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCandidateAuth } from '../../lib/session';
import { Button, Input, Field } from '@/portals/org/ui/ui';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useCandidateAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nextUrl = new URLSearchParams(location.search).get('next') || (location.state as any)?.from || '/candidate/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      const hasResume = Boolean(result.profile?.resumeFileName);
      if (!hasResume) {
        navigate(`/candidate/resume?next=${encodeURIComponent(nextUrl)}&onboarding=true`, { replace: true });
      } else {
        navigate(nextUrl, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid candidate email or password');
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
          <h2 className="text-2xl font-bold text-slate-900">Sign in to your Candidate Account</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your job applications and profile</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email Address">
            <Input
              type="email"
              required
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              required
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 text-sm text-slate-600">
          Don't have a candidate account?{' '}
          <Link
            to={nextUrl && nextUrl !== '/candidate/dashboard' ? `/register?next=${encodeURIComponent(nextUrl)}` : '/register'}
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
