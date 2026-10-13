// ============================================================
// Clyptus Landing Page - Section 3.13: Application Tracker
// 5-stage timeline: Applied, Screening, Technical Interview, Final Interview, Offer.
// Demonstrates real-time application visibility without ghosting.
// ============================================================

import React, { useState } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import {
  Send,
  FileCheck2,
  Code2,
  Users2,
  Trophy,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react';

export const ApplicationTrackerSection: React.FC = () => {
  const [activeStageIndex, setActiveStageIndex] = useState(2); // Technical Interview active

  const stages = [
    { id: 0, label: 'Applied', date: 'Oct 10, 10:30 AM', icon: Send, status: 'Completed' },
    { id: 1, label: 'Screening', date: 'Oct 11, 02:15 PM', icon: FileCheck2, status: 'Completed' },
    { id: 2, label: 'Technical Interview', date: 'Oct 14, 04:00 PM', icon: Code2, status: 'Active Stage' },
    { id: 3, label: 'Final Interview', date: 'Pending completion', icon: Users2, status: 'Upcoming' },
    { id: 4, label: 'Offer Extended', date: 'Decision milestone', icon: Trophy, status: 'Upcoming' },
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="APPLICATION TRACKER"
          heading="Stay on top of every single step."
          subheading="Say goodbye to black-hole job boards. Track your application status in real-time as hiring teams progress."
        />

        {/* Tracker Overview Card */}
        <div className="max-w-4xl mx-auto bg-[#FFFDF9] border border-[#E5D9CF] rounded-3xl p-6 sm:p-10 shadow-lg space-y-8">
          {/* Top Job Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5D9CF]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-base shadow-xs">
                ZL
              </div>
              <div>
                <h4 className="text-base font-editorial font-bold text-[#171614]">
                  Staff Distributed Systems Engineer
                </h4>
                <div className="text-xs text-[#62564E] flex items-center gap-1.5">
                  <span>Zenitha Labs</span>
                  <span>·</span>
                  <span>Bengaluru (Remote)</span>
                  <span>·</span>
                  <span className="text-[#E8630A] font-semibold">₹42 - 70 LPA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#1d7d4d] animate-ping" />
              <span>Active in Stage 3</span>
            </div>
          </div>

          {/* 5-Step Timeline Bar */}
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-2 relative">
              {/* Connecting Background Line */}
              <div className="absolute top-5 left-4 right-4 h-1 bg-[#E5D9CF] -z-0" />
              {/* Completed Progress Line */}
              <div className="absolute top-5 left-4 w-1/2 h-1 bg-[#E8630A] -z-0 transition-all duration-300" />

              {stages.map((stage, idx) => {
                const Icon = stage.icon;
                const isCompleted = idx < activeStageIndex;
                const isActive = idx === activeStageIndex;

                return (
                  <div
                    key={stage.id}
                    onClick={() => setActiveStageIndex(idx)}
                    className="flex flex-col items-center text-center cursor-pointer group z-10"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                        isCompleted
                          ? 'bg-[#1d7d4d] text-white shadow-xs'
                          : isActive
                          ? 'bg-[#E8630A] text-white ring-4 ring-[#FCEFE6] shadow-sm scale-105'
                          : 'bg-[#FAF7F2] text-[#8C7E74] border border-[#E5D9CF]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>

                    <div className="mt-3 space-y-0.5">
                      <div
                        className={`text-xs font-bold leading-tight ${
                          isActive
                            ? 'text-[#E8630A]'
                            : isCompleted
                            ? 'text-[#171614]'
                            : 'text-[#8C7E74]'
                        }`}
                      >
                        {stage.label}
                      </div>
                      <div className="text-[10px] text-[#8C7E74] hidden sm:block">
                        {stage.date}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Detail Box */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E8630A]" />
                <span className="text-[#62564E]">
                  Current Step: <strong className="text-[#171614]">{stages[activeStageIndex].label}</strong> ({stages[activeStageIndex].status})
                </span>
              </div>
              <span className="text-[#1d7d4d] font-semibold hidden sm:inline">
                Hiring manager SLA: Review within 48 business hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
