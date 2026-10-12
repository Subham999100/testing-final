// ============================================================
// Clyptus Job Portal - Candidate Portal
// Layout: CandidateShell (Authenticated Workspace)
// Provides candidate navigation header and content area
// ============================================================

import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { Briefcase, FileText, LayoutDashboard, LogOut, Search, User } from 'lucide-react';
import { useCandidateAuth } from '../lib/session';
import { Footer } from './Footer';
import '../candidate.css';

export const CandidateShell: React.FC = () => {
  const { user, logout } = useCandidateAuth();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/candidate/applications', label: 'My Applications', icon: Briefcase },
    { to: '/candidate/profile', label: 'Profile', icon: User },
    { to: '/candidate/resume', label: 'Resume', icon: FileText },
  ];

  return (
    <div className="candidate-portal flex flex-col min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                C
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight hidden sm:inline">
                Clyptus <span className="text-orange-600 font-semibold text-sm">Careers</span>
              </span>
            </Link>

            <Link
              to="/jobs"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Browse All Jobs</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user ? `${user.firstName} ${user.lastName}` : 'Candidate'}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
