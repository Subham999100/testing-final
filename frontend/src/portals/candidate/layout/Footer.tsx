// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: Public Footer
// Contains Platform Administration link only in the footer
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
                C
              </div>
              <span className="font-bold text-lg text-white">Clyptus Careers</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm">
              Discover verified career opportunities from premier employers. Build your profile, apply directly, and track your application status in real time.
            </p>
          </div>

          {/* Candidates */}
          <div>
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-3">For Candidates</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">Browse Jobs</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Candidate Login</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">Create Account</Link>
              </li>
            </ul>
          </div>

          {/* Employers & Platform */}
          <div>
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider mb-3">Employers & Admin</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/org/login" className="hover:text-white transition-colors">Recruiter Portal</Link>
              </li>
              <li>
                <Link to="/apply" className="hover:text-white transition-colors">Register Organisation</Link>
              </li>
              <li className="pt-2 border-t border-slate-800">
                <Link
                  to="/platform/login"
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
                  title="Platform Super Admin Portal"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Platform Administration
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Clyptus Software Solutions. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Verified Recruitment Platform</span>
            <span>GDPR & Privacy Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
