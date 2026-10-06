import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  LockKeyhole,
  Eye,
  EyeOff,
  Shield,
  Users2,
  Sliders,
  FileCheck2,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Brand } from '../../components/common/Brand';
import workplace from '../../assets/auth-workplace.svg';

const superAdminLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid Super Admin platform email'),
  password: z.string().min(8, 'Password must contain at least 8 characters'),
  rememberMe: z.boolean(),
});

type SuperAdminLoginForm = z.infer<typeof superAdminLoginSchema>;

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    user,
    isHydrating,
    isAuthenticating,
    authError,
    login,
    clearAuthError,
  } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SuperAdminLoginForm>({
    resolver: zodResolver(superAdminLoginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    return () => clearAuthError();
  }, [clearAuthError]);

  if (!isHydrating && user) {
    return <Navigate to="/platform" replace />;
  }

  const onSubmit = async (values: SuperAdminLoginForm) => {
    if (isAuthenticating || isHydrating) return;
    clearAuthError();
    try {
      await login(values.email, values.password, 'PLATFORM_SUPER_ADMIN', values.rememberMe);
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(
        requestedPath?.startsWith('/platform') ? requestedPath : '/platform',
        { replace: true },
      );
    } catch {
      // Store captures the error message
    }
  };

  return (
    <main className="auth-shell">
      {/* Governance Themed Visual Art Panel */}
      <aside className="auth-art" aria-label="Platform Super Admin Governance">
        <img
          src={workplace}
          alt="Architectural space symbolizing high-assurance platform governance"
        />
        <Brand subtitle="Super Admin" />
        <div className="auth-art-copy">
          <div className="flex items-center gap-2 mb-3 text-xs tracking-wider uppercase font-semibold text-amber-300">
            <Crown className="w-4 h-4" aria-hidden="true" />
            Platform Governance & Control Plane
          </div>
          <h2>Executive Governance & Control Plane.</h2>
          <p className="mb-4">
            System-wide administration, delegated administrator governance, and foundational platform configuration.
          </p>
          <div className="space-y-2 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <Users2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Administrator management & privilege assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>System-wide configuration & token economic rules</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Immutable cryptographic audit logs & intrusion alerts</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Super Admin Login Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-content">
          {!isAuthenticating && (
            <Link
              to="/platform"
              state={location.state}
              className="text-link auth-back"
            >
              <ArrowLeft aria-hidden="true" />
              Back to portal selection
            </Link>
          )}

          {isHydrating && (
            <p role="status" className="text-muted mb-4">
              Restoring your session...
            </p>
          )}

          <div className="auth-heading">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
              <Crown className="w-4 h-4" aria-hidden="true" />
              <span>01 / Governance Portal</span>
            </div>
            <h1>Super Admin Login</h1>
            <p>
              Sign in with your Super Administrator credentials to oversee system governance, platform administrators, and global settings.
            </p>
          </div>

          <form
            aria-label="Super Admin Login"
            onSubmit={handleSubmit(onSubmit)}
            className="auth-form"
            noValidate
          >
            <div>
              <label htmlFor="super-admin-email" className="field-label">
                Email address
              </label>
              <input
                id="super-admin-email"
                type="email"
                autoComplete="username"
                {...register('email')}
                className="field-input"
                placeholder="superadmin@clyptus.platform"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'super-admin-email-error' : undefined}
                disabled={isAuthenticating || isHydrating}
              />
              {errors.email && (
                <p id="super-admin-email-error" className="field-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="super-admin-password" className="field-label">
                Password
              </label>
              <div className="password-field relative flex items-center">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="super-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="field-input pr-10"
                  placeholder="Enter your security password"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'super-admin-password-error' : undefined
                  }
                  disabled={isAuthenticating || isHydrating}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="super-admin-password-error" className="field-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="remember-row">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  disabled={isAuthenticating || isHydrating}
                />
                Remember this governance session
              </label>
              <p className="remember-note">
                Stay signed in on this authorized workstation for up to 30 days.
              </p>
            </div>

            {authError && (
              <div role="alert" className="status-error flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating || isHydrating}
              className="button button-primary button-large"
            >
              {isAuthenticating ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Authenticating Super Admin...
                </>
              ) : (
                <>
                  Sign in as Super Admin
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-footnote">
            Root platform governance zone. Unauthorized access attempts are monitored, blocked by rate limiting, and recorded in the immutable security audit ledger.
          </p>
        </div>
      </div>
    </main>
  );
};
