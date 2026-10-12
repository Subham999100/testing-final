// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: HomePage (Phase 1 Skeleton)
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
      <div className="max-w-3xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
          <span>Verified Career Opportunities</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          Find your next career leap at Clyptus
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Explore verified positions across engineering, product, design, and operations. Apply directly and manage your job applications in one place.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search All Jobs</span>
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-6 py-3 rounded-xl border border-slate-300 shadow-sm transition-colors"
          >
            <span>Create Candidate Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
