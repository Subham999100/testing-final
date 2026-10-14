// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: Public Navbar
// Includes Recruiter Login link (/org/login) and Candidate Auth links
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, LogOut, Menu, User, X } from 'lucide-react';
import { useCandidateAuth } from '../lib/session';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useCandidateAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-decoration-none">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            C
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            Clyptus <span className="text-orange-600 font-semibold text-base">Careers</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/jobs" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Find Jobs
          </Link>
          <Link
            to="/org/login"
            className="text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1.5"
            title="Recruiter & Employer Portal"
          >
            <Briefcase className="w-4 h-4" />
            Recruiter Login
          </Link>

          <div className="h-4 w-px bg-slate-200" />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/candidate/dashboard"
                className="text-sm font-medium text-slate-700 hover:text-blue-600 flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-blue-600" />
                {user.firstName}
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-3">
          <Link
            to="/jobs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-slate-700 hover:text-slate-900 py-1"
          >
            Find Jobs
          </Link>
          <Link
            to="/org/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-orange-600 hover:text-orange-700 py-1"
          >
            Recruiter Login
          </Link>
          <div className="pt-2 border-t border-slate-100">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link
                  to="/candidate/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-base font-medium text-blue-600 py-1"
                >
                  Candidate Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left text-base font-medium text-red-600 py-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
