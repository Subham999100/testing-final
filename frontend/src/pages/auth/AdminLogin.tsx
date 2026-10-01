import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building2,
  LockKeyhole,
  Eye,
  EyeOff,
  CircleCheck,
  Headphones,
  CheckCircle2,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { Brand } from '../../components/common/Brand';
import workplace from '../../assets/auth-workplace.svg';

const adminLoginSchema = z.object({
  email: z.string().trim().email('Enter a valid Admin platform email'),
  password: z.string().min(8, 'Password must contain at least 8 characters'),
  rememberMe: z.boolean(),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export const AdminLogin: React.FC = () => {
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
  } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  useEffect(() => {
    return () => clearAuthError();
  }, [clearAuthError]);

  if (!isHydrating && user) {
    return <Navigate to="/platform" replace />;
  }

  const onSubmit = async (values: AdminLoginForm) => {
    if (isAuthenticating || isHydrating) return;
    clearAuthError();
    try {
      await login(values.email, values.password, 'PLATFORM_ADMIN', values.rememberMe);
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
      {/* Operations Themed Visual Art Panel */}
      <aside className="auth-art" aria-label="Platform Admin Operations">
        <img
          src={workplace}
          alt="Architectural workspace symbolizing active platform operations and tenant management"
        />
        <Brand subtitle="Platform Admin" />
        <div className="auth-art-copy">
          <div className="flex items-center gap-2 mb-3 text-xs tracking-wider uppercase font-semibold text-cyan-300">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Platform Operations & Support Plane
          </div>
          <h2>Platform Operations & Tenant Management.</h2>
          <p className="mb-4">
            Day-to-day platform oversight, organization onboarding verification, and enterprise customer operational support.
          </p>
          <div className="space-y-2 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              <span>Organization management & verification workflows</span>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              <span>Tenant compliance, moderation & queue management</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              <span>Platform support ticketing & resolution tracking</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Admin Login Form Panel */}
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 mb-1">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>02 / Operations Portal</span>
            </div>
            <h1>Admin Login</h1>
            <p>
              Sign in with your operational staff credentials to manage organizations, process verifications, and run daily platform operations.
            </p>
          </div>

          <form
            aria-label="Admin Login"
            onSubmit={handleSubmit(onSubmit)}
            className="auth-form"
            noValidate
          >
            <div>
              <label htmlFor="admin-email" className="field-label">
                Email address
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                {...register('email')}
                className="field-input"
                placeholder="admin@clyptus.platform"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'admin-email-error' : undefined}
                disabled={isAuthenticating || isHydrating}
              />
              {errors.email && (
                <p id="admin-email-error" className="field-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="admin-password" className="field-label">
                Password
              </label>
              <div className="password-field">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="field-input"
                  placeholder="Enter your operational password"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'admin-password-error' : undefined
                  }
                  disabled={isAuthenticating || isHydrating}
                />
              </div>
              {errors.password && (
                <p id="admin-password-error" className="field-error">
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
                Remember this operational session
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
                  Authenticating Admin...
                </>
              ) : (
                <>
                  Sign in as Admin
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-footnote">
            Delegated platform operations access. Accessible workspaces and resources are determined strictly by your assigned operational permissions.
          </p>
        </div>
      </div>
    </main>
  );
};
