// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: RegisterPage (Candidate Registration)
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCandidateAuth } from '../../lib/session';
import { Button, Input, Field } from '@/portals/org/ui/ui';
import { AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useCandidateAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
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
      });
      // Route new candidate to resume upload onboarding
      navigate('/candidate/resume', { replace: true });
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
              placeholder="+1 555-0123"
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              required
              value={form.password}
              onChange={(e: any) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, 1 uppercase, 1 symbol"
              autoComplete="new-password"
            />
          </Field>
          <p className="text-xs text-slate-500 -mt-2">
            Must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special symbol.
          </p>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
