// ============================================================
// Clyptus Landing Page - Section 3.14: How It Works
// 4 numbered candidate journey steps connected visually.
// ============================================================

import React from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import { UserPlus, Sparkles, CheckCheck, Briefcase } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Create Your Profile',
      desc: 'Upload your resume or build one using our ATS builder. Highlight verified competencies and target salary.',
      icon: UserPlus,
    },
    {
      num: '02',
      title: 'Get Matched',
      desc: 'Our engine cross-checks live engineering demand across 12 Indian tech hubs to surface verified fit roles.',
      icon: Sparkles,
    },
    {
      num: '03',
      title: 'Swipe and Apply',
      desc: 'Apply in a single click without repetitive forms or cold cover letters. Direct dispatch to hiring leads.',
      icon: CheckCheck,
    },
    {
      num: '04',
      title: 'Interview & Get Hired',
      desc: 'Participate in verified engineering interviews, track offers in real-time, and negotiate with transparency.',
      icon: Briefcase,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="CANDIDATE JOURNEY"
          heading="How Clyptus works for you."
          subheading="A predictable, dignified hiring journey engineered from day one to respect your time and expertise."
        />

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;

            return (
              <div
                key={s.num}
                className="p-7 rounded-3xl bg-[#FAF7F2] border border-[#E5D9CF] hover:border-[#E8630A] transition-all duration-150 space-y-4 shadow-xs relative group"
              >
                {/* Number Badge */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#E8630A] flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-editorial text-2xl font-bold text-[#E5D9CF] group-hover:text-[#E8630A] transition-colors">
                    {s.num}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-lg font-editorial font-bold text-[#171614]">
                    {s.title}
                  </h4>
                  <p className="text-xs text-[#62564E] leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
