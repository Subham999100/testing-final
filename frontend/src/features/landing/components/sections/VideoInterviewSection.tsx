// ============================================================
// Clyptus Landing Page - Section 3.8: AI Video Interview
// Simulated 15-minute AI interview screen: SVG interviewer avatar,
// question text typing animation, progress indicator, skill areas sidebar,
// "Interview-verified" badge, and 3 illustrative stats cards.
// ============================================================

import React, { useState, useEffect } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import {
  Bot,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Code2,
  Brain,
  MessageSquare,
} from 'lucide-react';

export const VideoInterviewSection: React.FC = () => {
  const [typedQuestion, setTypedQuestion] = useState('');
  const fullQuestion =
    'How would you architect a distributed rate-limiter across 12 container instances without creating a Redis bottleneck under 100k requests per second?';

  // Typing animation simulation
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedQuestion(fullQuestion.slice(0, index));
      index += 1;
      if (index > fullQuestion.length) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="video-interview"
      className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="AI VIDEO INTERVIEW"
          heading="Stand out with a 15-minute AI interview."
          subheading="Validate your problem-solving depth on your own schedule and earn the interview-verified badge on your profile."
        />

        {/* Main Simulated Interview Screen */}
        <div className="max-w-4xl mx-auto bg-[#FAF7F2] border-2 border-[#E5D9CF] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5D9CF]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d7d4d] animate-pulse" />
              <span className="text-xs font-bold text-[#171614]">
                Question 3 of 8
              </span>
              <span className="text-xs text-[#8C7E74]">· 09:42 left (15:00 total)</span>
            </div>

            {/* Verification Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCEFE6] text-[#E8630A] border border-[#E8630A]/20 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Interview-Verified Candidate</span>
            </div>
          </div>

          {/* Interactive Screen Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Center Area: AI Interviewer & Question (8 cols) */}
            <div className="md:col-span-8 bg-[#FFFDF9] border border-[#E5D9CF] rounded-2xl p-6 space-y-6 flex flex-col justify-between shadow-xs">
              <div className="flex items-start gap-4">
                {/* Abstract AI Avatar SVG */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E8630A] to-[#D97706] p-0.5 shrink-0 shadow-md">
                  <div className="w-full h-full bg-[#FFFDF9] rounded-2xl flex items-center justify-center text-[#E8630A]">
                    <Bot className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#E8630A]">
                    Clyptus AI Technical Evaluator
                  </div>
                  <div className="text-xs text-[#8C7E74]">
                    Interactive architectural reasoning prompt
                  </div>
                </div>
              </div>

              {/* Typing Question Text Area */}
              <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] min-h-[110px]">
                <p className="text-sm font-medium text-[#171614] leading-relaxed">
                  "{typedQuestion}"
                  <span className="inline-block w-1.5 h-4 ml-1 bg-[#E8630A] animate-pulse align-middle" />
                </p>
              </div>

              {/* Response Status Bar */}
              <div className="flex items-center justify-between text-xs text-[#62564E] pt-2 border-t border-[#E5D9CF]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#E8630A]" />
                  <span>Time limit for this answer: 2 min 30 sec</span>
                </span>
                <span className="text-[11px] font-semibold text-[#1d7d4d]">
                  Microphone Active (Mock)
                </span>
              </div>
            </div>

            {/* Sidebar: Skill Areas Covered (4 cols) */}
            <div className="md:col-span-4 bg-[#FFFDF9] border border-[#E5D9CF] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7E74] pb-2 border-b border-[#E5D9CF]">
                  Evaluation Domains
                </h4>

                <div className="space-y-3.5 pt-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#171614]">
                      <span className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-[#E8630A]" />
                        <span>Technical Depth</span>
                      </span>
                      <span className="text-[#1d7d4d] font-bold">92%</span>
                    </div>
                    <div className="h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E5D9CF]">
                      <div className="h-full bg-[#1d7d4d] w-[92%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#171614]">
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-[#E8630A]" />
                        <span>Problem Solving</span>
                      </span>
                      <span className="text-[#E8630A] font-bold">88%</span>
                    </div>
                    <div className="h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E5D9CF]">
                      <div className="h-full bg-[#E8630A] w-[88%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#171614]">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#E8630A]" />
                        <span>Communication</span>
                      </span>
                      <span className="text-[#E8630A] font-bold">85%</span>
                    </div>
                    <div className="h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E5D9CF]">
                      <div className="h-full bg-[#E8630A] w-[85%]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D9CF] text-[11px] text-[#62564E]">
                Autonomous benchmarking calibrated to mid-to-staff engineering levels.
              </div>
            </div>
          </div>
        </div>

        {/* 3 Illustrative Stats Cards */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] text-center space-y-1.5">
              <div className="text-3xl font-editorial font-bold text-[#E8630A]">
                3x
              </div>
              <div className="text-xs font-bold text-[#171614]">More Recruiter Views</div>
              <p className="text-[11px] text-[#62564E]">
                Verified profiles rank higher in regional talent discovery feeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] text-center space-y-1.5">
              <div className="text-3xl font-editorial font-bold text-[#1d7d4d]">
                48 hrs
              </div>
              <div className="text-xs font-bold text-[#171614]">Fast-Track Responses</div>
              <p className="text-[11px] text-[#62564E]">
                Skip initial recruiter phone screens directly to technical interviews.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] text-center space-y-1.5">
              <div className="text-3xl font-editorial font-bold text-[#171614]">
                100%
              </div>
              <div className="text-xs font-bold text-[#171614]">Candidate Privacy</div>
              <p className="text-[11px] text-[#62564E]">
                Record in private. Only share results when you approve of your score.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-center text-[#8C7E74]">
            * Illustrative figures based on early platform beta cohorts.
          </p>
        </div>
      </div>
    </section>
  );
};
