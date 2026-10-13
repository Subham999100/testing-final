// ============================================================
// Clyptus Landing Page - Section 3.7: AI Video Profile
// Simulated 3-minute video pitch recorder UI in laptop/phone frame,
// interactive timer countdown, teleprompter prompt cycles,
// AI speech insights chips, and 3-step explanation. NO camera hardware access.
// ============================================================

import React, { useState, useEffect } from 'react';
import { SectionHeading } from '../shared/SectionHeading';
import {
  Video,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  User,
  Mic,
  Smile,
} from 'lucide-react';

export const VideoProfileSection: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3:00
  const [promptIndex, setPromptIndex] = useState(0);

  const prompts = [
    'Tell us about yourself and your engineering background.',
    'What was your proudest technical project and its measurable impact?',
    'What kind of engineering culture and challenge do you want next?',
  ];

  // Countdown timer simulation
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRecording(false);
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setSecondsRemaining(180);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <section
      id="video-profile"
      className="py-20 lg:py-28 bg-[#FAF7F2] border-t border-[#E5D9CF] relative scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="AI VIDEO PROFILE"
          heading="Introduce yourself in 3 minutes."
          subheading="Skip cold resumes and let your communication clarity, technical depth, and energy speak directly to hiring teams."
        />

        {/* 2-Column Grid: Left Explainer, Right Mock Recorder UI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Explainer Steps (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614] leading-tight">
              A structured, low-pressure introduction designed for developers.
            </h3>
            <p className="text-base text-[#62564E] leading-relaxed">
              No live recruiter on the line. Practice with guided teleprompter questions and re-record as many times as you like before sharing.
            </p>

            {/* 3 Steps Explainer */}
            <div className="space-y-4 pt-2">
              {[
                {
                  step: '01',
                  title: 'Guided Teleprompter Prompts',
                  desc: 'Stay on track with 3 curated questions tailored to senior engineering evaluation.',
                },
                {
                  step: '02',
                  title: 'Private AI Feedback Loop',
                  desc: 'Review pacing, clarity, and keyword coverage before submitting to any hiring partner.',
                },
                {
                  step: '03',
                  title: 'Direct Recruiter Review',
                  desc: 'Founding teams and hiring managers watch your pitch before scheduling technical rounds.',
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] flex items-start gap-4 shadow-xs"
                >
                  <span className="w-8 h-8 rounded-xl bg-[#FCEFE6] text-[#E8630A] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#171614]">{s.title}</h4>
                    <p className="text-xs text-[#62564E] mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Mock Recorder Frame (7 cols) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-lg bg-[#FFFDF9] border-2 border-[#E5D9CF] rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 relative">
              {/* Device Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5D9CF]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#E5D9CF]" />
                  <span className="w-3 h-3 rounded-full bg-[#E5D9CF]" />
                  <span className="w-3 h-3 rounded-full bg-[#E5D9CF]" />
                  <span className="text-[11px] font-bold text-[#8C7E74] ml-2">
                    Studio Pitch Recorder
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isRecording && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#b63a2d] animate-ping" />
                  )}
                  <span className="text-xs font-mono font-bold text-[#171614]">
                    {formatTimer(secondsRemaining)} / 3:00
                  </span>
                </div>
              </div>

              {/* Camera Simulator Area (Abstract Avatar Silhouette, NO CAMERA HARDWARE) */}
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#2D2825] to-[#171614] overflow-hidden flex flex-col items-center justify-center text-white p-6 shadow-inner">
                {/* Silhouette Avatar */}
                <div className="w-24 h-24 rounded-full bg-[#3D352E] border-2 border-[#62564E] flex items-center justify-center shadow-lg relative">
                  <User className="w-12 h-12 text-[#D7C7B8]" />
                  {isRecording && (
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#1d7d4d] text-white">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Teleprompter Prompt Banner */}
                <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[#E8630A]">
                    Question {promptIndex + 1} of 3
                  </div>
                  <div className="text-xs font-medium text-white/90 mt-0.5">
                    "{prompts[promptIndex]}"
                  </div>
                </div>

                {/* Question Switcher Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/70">
                  <button
                    type="button"
                    onClick={() =>
                      setPromptIndex((prev) => (prev > 0 ? prev - 1 : prompts.length - 1))
                    }
                    className="hover:text-white"
                  >
                    ← Previous
                  </button>
                  <span className="text-[10px] text-white/50">Guided Teleprompter</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptIndex((prev) => (prev < prompts.length - 1 ? prev + 1 : 0))
                    }
                    className="hover:text-white"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Recorder Controls Bar */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors ${
                    isRecording
                      ? 'bg-[#b63a2d] hover:bg-[#9a2f24] text-white'
                      : 'bg-[#E8630A] hover:bg-[#D05300] text-white shadow-sm'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop & Analyze</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start 3-Min Pitch</span>
                    </>
                  )}
                </button>

                <div className="text-[11px] text-[#8C7E74]">
                  Simulated sandbox · No video stored
                </div>
              </div>

              {/* AI Insights Panel */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#171614]">
                    <Sparkles className="w-3.5 h-3.5 text-[#E8630A]" />
                    <span>Real-Time AI Speech Insights</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#1d7d4d]">Calibrated</span>
                </div>

                {/* 4 Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-center">
                    <div className="text-[10px] text-[#8C7E74]">Clarity</div>
                    <div className="text-sm font-bold text-[#171614]">86 / 100</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-center">
                    <div className="text-[10px] text-[#8C7E74]">Confidence</div>
                    <div className="text-sm font-bold text-[#171614]">79 / 100</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-center">
                    <div className="text-[10px] text-[#8C7E74]">Speaking Pace</div>
                    <div className="text-sm font-bold text-[#1d7d4d]">Good (132 wpm)</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-center">
                    <div className="text-[10px] text-[#8C7E74]">Filler Words</div>
                    <div className="text-sm font-bold text-[#1d7d4d]">Low (2%)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
