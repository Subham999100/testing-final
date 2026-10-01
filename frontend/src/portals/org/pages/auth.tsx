// ============================================================
// Organisation portal — sign in & accept invitation
// ============================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import '../org.css';
import { api, errorMessage } from '../lib/api';
import { label } from '../lib/format';
import { getToken, login } from '../lib/session';
import { Button, Card, Field, Input } from '../ui/ui';

function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="org-auth flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Briefcase className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-slate-800">Clyptus Hiring</span>
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </Card>
      </div>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const state = location.state as { from?: string; message?: string } | null;
  const [error, setError] = useState<string | null>(state?.message ?? null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  if (getToken() && !state?.message) return <Navigate to="/org" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await login(values.email, values.password);
      qc.clear();
      if (res?.requiresPasswordChange) {
        navigate('/org/change-password', { replace: true });
      } else {
        navigate(state?.from && state.from.startsWith('/org') && !state.from.startsWith('/org/change-password') ? state.from : '/org', { replace: true });
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not sign in'));
    }
  });

  return (
    <AuthLayout title="Sign in to your workspace" subtitle="For organisation admins and recruiters.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <Field label="Work email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus {...register('email')} />
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(10, 'At least 10 characters')
      .regex(/[A-Za-z]/, 'Include a letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from current password',
  });

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
  });

  if (!getToken()) return <Navigate to="/org/login" replace />;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.post('/org/auth/change-password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
        confirmPassword: v.confirmPassword,
      });
      await qc.invalidateQueries();
      navigate('/org', { replace: true });
    } catch (e) {
      setError(errorMessage(e, 'Could not change password'));
    }
  });

  return (
    <AuthLayout
      title="Change Your Password"
      subtitle="For security, you must change your password before accessing your workspace."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <Field label="Current Password" error={formState.errors.currentPassword?.message}>
          <Input type="password" autoComplete="current-password" autoFocus {...register('currentPassword')} />
        </Field>
        <Field
          label="New Password"
          error={formState.errors.newPassword?.message}
          hint="10+ characters with letters and numbers"
        >
          <Input type="password" autoComplete="new-password" {...register('newPassword')} />
        </Field>
        <Field label="Confirm New Password" error={formState.errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Change Password
        </Button>
      </form>
    </AuthLayout>
  );
}

const acceptSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Required').max(80),
    lastName: z.string().trim().min(1, 'Required').max(80),
    password: z
      .string()
      .min(10, 'At least 10 characters')
      .regex(/[A-Za-z]/, 'Include a letter')
      .regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const preview = useQuery({
    queryKey: ['org', 'invite-preview', token],
    queryFn: () => api.get<{ email: string; role: string; organisationName: string; expiresAt: string }>('/org/invitations/preview', { token }),
    enabled: !!token,
    retry: false,
  });
  const { register, handleSubmit, formState } = useForm<z.infer<typeof acceptSchema>>({ resolver: zodResolver(acceptSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.post('/org/invitations/accept', { token, firstName: v.firstName, lastName: v.lastName, password: v.password });
      await login(preview.data.email, v.password);
      navigate('/org', { replace: true });
    } catch (e) {
      setError(errorMessage(e, 'Could not accept the invitation'));
    }
  });

  if (!token || preview.isError) {
    return (
      <AuthLayout title="Invitation unavailable" subtitle={errorMessage(preview.error, 'This invitation link is invalid.')}>
        <Link to="/org/login" className="text-sm font-medium text-indigo-600 hover:underline">
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }
  if (preview.isLoading) {
    return (
      <AuthLayout title="Checking your invitation…">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={`Join ${preview.data.organisationName}`} subtitle={`You were invited as ${label(preview.data.role)} (${preview.data.email}).`}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={formState.errors.firstName?.message}>
            <Input autoFocus {...register('firstName')} />
          </Field>
          <Field label="Last name" error={formState.errors.lastName?.message}>
            <Input {...register('lastName')} />
          </Field>
        </div>
        <Field label="Password" error={formState.errors.password?.message} hint="10+ characters with letters and numbers">
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Confirm password" error={formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Create account & join
        </Button>
      </form>
    </AuthLayout>
  );
}
