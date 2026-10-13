// ============================================================
// Clyptus Landing Page - Section 3.11: Stats Strip
// 4 core candidate journey stats + impressive illustrative ecosystem metrics.
// ============================================================

import React from 'react';
import { UserCheck, GitFork, RefreshCw, Activity, Sparkles } from 'lucide-react';

export const StatsStrip: React.FC = () => {
  return (
    <section className="py-16 bg-[#FAF7F2] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Core 4 Journey Pillars */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] text-center space-y-1.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
              1 Profile
            </div>
            <div className="text-xs font-semibold text-[#E8630A]">Build once</div>
            <p className="text-[11px] text-[#62564E]">
              Share with multiple verified hiring teams with single-click ease.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] text-center space-y-1.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto mb-2">
              <GitFork className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
              4 Steps
            </div>
            <div className="text-xs font-semibold text-[#E8630A]">From search to offer</div>
            <p className="text-[11px] text-[#62564E]">
              Streamlined evaluation lifecycle eliminating recruiter intermediaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] text-center space-y-1.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto mb-2">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
              Daily
            </div>
            <div className="text-xs font-semibold text-[#E8630A]">Fresh verified roles</div>
            <p className="text-[11px] text-[#62564E]">
              New direct hiring openings vetted for verified budgets every morning.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] text-center space-y-1.5 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center mx-auto mb-2">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
              24/7
            </div>
            <div className="text-xs font-semibold text-[#E8630A]">Application tracking</div>
            <p className="text-[11px] text-[#62564E]">
              End-to-end transparent visibility at every review milestone.
            </p>
          </div>
        </div>

        {/* Second Row: Illustrative Ecosystem Metrics */}
        <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-[#E5D9CF]">
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#E8630A]">
                12,400+
              </div>
              <div className="text-xs font-bold text-[#171614]">Open Engineering Roles</div>
              <div className="text-[10px] text-[#8C7E74]">Across 12 Indian tech hubs</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
                850+
              </div>
              <div className="text-xs font-bold text-[#171614]">Verified Employers</div>
              <div className="text-[10px] text-[#8C7E74]">Direct hiring partners</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614]">
                ₹24.8 LPA
              </div>
              <div className="text-xs font-bold text-[#171614]">Median Package</div>
              <div className="text-[10px] text-[#8C7E74]">Transparent INR CTC ranges</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-2xl sm:text-3xl font-editorial font-bold text-[#1d7d4d]">
                4.8 / 5
              </div>
              <div className="text-xs font-bold text-[#171614]">Candidate Experience</div>
              <div className="text-[10px] text-[#8C7E74]">Zero ghosting platform standard</div>
            </div>
          </div>
          <div className="text-[10px] text-center text-[#8C7E74] pt-4 mt-4 border-t border-[#E5D9CF]">
            * Metrics reflect active database ecosystem benchmarks and beta cohort averages.
          </div>
        </div>
      </div>
    </section>
  );
};
