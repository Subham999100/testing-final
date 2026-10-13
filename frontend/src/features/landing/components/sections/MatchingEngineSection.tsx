// ============================================================
// Clyptus Landing Page - Section 3.12: Matching Engine
// 3-step flow: Candidate Profile -> Fit Model -> Recommended Jobs,
// showcasing a 96% match job card with interactive CTAs.
// ============================================================

import React from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import {
  UserCheck,
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MatchingEngineSectionProps {
  onOpenSignInModal: (title?: string) => void;
}

export const MatchingEngineSection: React.FC<MatchingEngineSectionProps> = ({
  onOpenSignInModal,
}) => {
  return (
    <section className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="PRECISION REASONING"
          heading="How our matching engine finds your ideal role."
          subheading="A three-stage evaluation cycle analyzing deep technical competencies rather than simple keyword matches."
        />

        {/* 3-Step Flow Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] space-y-4 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center font-bold text-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#E8630A]">
                Stage 01
              </div>
              <h4 className="text-xl font-editorial font-bold text-[#171614]">
                Candidate Profile
              </h4>
              <p className="text-xs text-[#62564E] leading-relaxed">
                Parse verified code samples, production experience, salary expectations, and preferred work models.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] space-y-4 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center font-bold text-lg">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#E8630A]">
                Stage 02
              </div>
              <h4 className="text-xl font-editorial font-bold text-[#171614]">
                Multi-Vector Fit Model
              </h4>
              <p className="text-xs text-[#62564E] leading-relaxed">
                Cross-correlate candidate competencies against organizational tech stack demands, team culture, and growth velocity.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] space-y-4 shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF7EE] text-[#1d7d4d] flex items-center justify-center font-bold text-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#1d7d4d]">
                Stage 03
              </div>
              <h4 className="text-xl font-editorial font-bold text-[#171614]">
                Recommended Jobs
              </h4>
              <p className="text-xs text-[#62564E] leading-relaxed">
                Direct dispatch to company engineering directors with guaranteed review timelines and transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Highlighted 96% Match Recommended Job Card */}
        <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#FAF7F2] border-2 border-[#E8630A]/30 shadow-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-base shadow-xs">
                NX
              </div>
              <div>
                <div className="text-sm font-bold text-[#171614]">Nexora AI Systems</div>
                <div className="text-xs text-[#62564E] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#E8630A]" />
                  <span>Bengaluru · Hybrid</span>
                </div>
              </div>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/30 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>96% Optimal Match</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-2xl font-editorial font-bold text-[#171614]">
              Lead Inference Systems Engineer
            </h4>
            <p className="text-xs text-[#62564E] leading-relaxed">
              Matched based on your deep expertise in PyTorch distributed runtime architectures, high-concurrency Python microservices, and 5+ years of scale.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold pt-1">
            <span className="text-base font-bold text-[#E8630A]">₹35 - 55 LPA</span>
            <span className="text-[#62564E]">4 - 8 yrs experience</span>
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-[#E5D9CF]">
            <a
              href="#jobs"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 text-decoration-none shadow-xs"
            >
              <span>Explore Matching Roles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => onOpenSignInModal('Sign in to calibrate your career profile')}
              className="px-5 py-2.5 rounded-xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-xs font-semibold text-[#171614] transition-colors"
            >
              Improve my profile score
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
