// ============================================================
// Clyptus Landing Page - Section 3.18: Final CTA & Recruiter Banner
// High-conversion orange gradient banner and slim employer recruiter banner.
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Building2, ShieldCheck } from 'lucide-react';

interface CtaSectionProps {
  onOpenComingSoonModal: (featureName?: string) => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({
  onOpenComingSoonModal,
}) => {
  return (
    <section className="py-20 lg:py-24 bg-[#FFFDF9] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Candidate Gradient Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#E8630A] via-[#D97706] to-[#C2410C] text-white p-8 sm:p-14 lg:p-16 shadow-2xl overflow-hidden text-center space-y-8">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 rounded-full bg-black/10 blur-2xl pointer-events-none" />

          {/* Banner Copy */}
          <div className="max-w-3xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DIRECT CANDIDATE WORKSPACE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-bold leading-tight tracking-tight">
              Your next chapter starts with one profile.
            </h2>

            <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto">
              Join thousands of engineers exploring verified tech hubs across India, optimizing resumes, and matching directly with hiring teams.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 pt-2">
            <Link
              to="/register"
              className="px-8 py-4 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#171614] font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-decoration-none"
            >
              <span>Create Candidate Account</span>
              <ArrowRight className="w-4 h-4 text-[#E8630A]" />
            </Link>

            <Link
              to="/login"
              className="px-8 py-4 rounded-xl bg-black/20 hover:bg-black/30 text-white border border-white/20 font-semibold text-sm backdrop-blur-xs transition-colors text-decoration-none"
            >
              Sign In to Workspace
            </Link>
          </div>

          {/* Privacy Footnote */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/80 relative z-10 pt-2">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Free for Job Seekers · Strict Data Privacy Standards</span>
          </div>
        </div>

        {/* Slim Recruiter Banner */}
        <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#171614]">
                Hiring technical talent?
              </span>
              <span className="text-xs text-[#62564E] block sm:inline sm:ml-2">
                Post direct jobs and engage verified candidate cohorts on Clyptus.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenComingSoonModal('Employer Job Posting Portal')}
            className="px-5 py-2.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-xs font-semibold text-[#171614] hover:text-[#E8630A] transition-colors shrink-0"
          >
            Post a Job for Employers →
          </button>
        </div>
      </div>
    </section>
  );
};
