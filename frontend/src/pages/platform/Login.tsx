// ============================================================
// Clyptus Job Portal - Platform Administration Sign In
// Path: /platform/login
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isInitializing, isLoggingIn, loginError, login, clearLoginError, initAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/platform';

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isInitializing && user) {
      navigate(from, { replace: true });
    }
  }, [user, isInitializing, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearLoginError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setValidationError('Please enter your administrator email');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password');
      return;
    }

    try {
      await login(cleanEmail, password);
      navigate(from, { replace: true });
    } catch {
      // loginError state in auth store captures the error message
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-[#080d1a] flex items-center justify-center text-slate-300">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mr-2" />
        <span className="text-sm font-medium">Checking session status...</span>
      </div>
    );
  }

  const activeError = validationError || loginError;

  return (
    <div className="min-h-screen w-full bg-[#080d1a] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">CLYPTUS PLATFORM</h1>
            <p className="text-xs text-slate-400">Administrative Control Plane</p>
          </div>
        </div>

        {/* Error Notification */}
        {activeError && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (activeError) {
                    setValidationError(null);
                    clearLoginError();
                  }
                }}
                placeholder="admin@clyptus.com"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (activeError) {
                    setValidationError(null);
                    clearLoginError();
                  }
                }}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Authoritative session logging and security telemetry active.
          </p>
        </div>
      </div>
    </div>
  );
};
