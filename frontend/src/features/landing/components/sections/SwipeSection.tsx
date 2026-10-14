// ============================================================
// Clyptus Landing Page - Section 3.4: Swipe to Apply
// Framer Motion card drag physics (right = apply, left = reject),
// keyboard navigation, pass/apply/undo buttons, live counters, and reset state.
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { SectionHeading } from '../shared/SectionHeading';
import { Job } from '../../types';
import {
  Sparkles,
  Check,
  X,
  RotateCcw,
  MapPin,
  Briefcase,
  ArrowRight,
  Target,
  ThumbsUp,
  Sliders,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface SwipeSectionProps {
  initialJobs: Job[];
  onOpenSignInModal: (title?: string) => void;
}

export const SwipeSection: React.FC<SwipeSectionProps> = ({
  initialJobs,
  onOpenSignInModal,
}) => {
  const [deck, setDeck] = useState<Job[]>(initialJobs);
  const [history, setHistory] = useState<{ job: Job; action: 'applied' | 'passed' }[]>([]);

  const appliedCount = history.filter((h) => h.action === 'applied').length;
  const passedCount = history.filter((h) => h.action === 'passed').length;

  const currentJob = deck[deck.length - 1];

  // Motion values for the top card
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.6, 0.9, 1, 0.9, 0.6]);

  // Stamps opacity
  const applyOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-20, -100], [0, 1]);

  const handleSwipe = (direction: 'right' | 'left') => {
    if (!currentJob) return;

    const action = direction === 'right' ? 'applied' : 'passed';
    setHistory((prev) => [...prev, { job: currentJob, action }]);
    setDeck((prev) => prev.slice(0, prev.length - 1));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setDeck((prev) => [...prev, last.job]);
  };

  const handleReset = () => {
    setDeck(initialJobs);
    setHistory([]);
  };

  // Keyboard navigation: Left Arrow to pass, Right Arrow to apply
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentJob) return;
      if (e.key === 'ArrowRight') {
        handleSwipe('right');
      } else if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentJob]);

  return (
    <section id="swipe" className="py-20 lg:py-28 bg-[#FFFDF9] border-t border-[#E5D9CF] relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Section Heading */}
        <SectionHeading
          eyebrow="SWIPE TO APPLY"
          heading="Swipe through roles picked for you."
          subheading="A lightweight recommendation flow that learns your preferences with every interaction."
        />

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Benefits Copy */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#171614] leading-tight">
                No long application forms. Just your verified fit.
              </h3>
              <p className="text-base text-[#62564E] leading-relaxed">
                Review curated opportunities scored against your tech stack, salary expectations, and career goals.
              </p>
            </div>

            {/* 3 Bullet Benefits */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF]">
                <div className="p-2 rounded-xl bg-[#FCEFE6] text-[#E8630A] shrink-0 mt-0.5">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#171614]">Recommendations ranked by fit</div>
                  <div className="text-xs text-[#62564E] mt-0.5">
                    Every position comes with a transparent match percentage and rationale.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF]">
                <div className="p-2 rounded-xl bg-[#EAF7EE] text-[#1d7d4d] shrink-0 mt-0.5">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#171614]">One swipe to apply</div>
                  <div className="text-xs text-[#62564E] mt-0.5">
                    Swipe right to share your verified resume directly with hiring managers.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E5D9CF]">
                <div className="p-2 rounded-xl bg-[#FAF7F2] text-[#8C7E74] border border-[#E5D9CF] shrink-0 mt-0.5">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#171614]">Reject to teach the model your taste</div>
                  <div className="text-xs text-[#62564E] mt-0.5">
                    Passing informs the engine to deprioritize misaligned tech stacks or industries.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Counters */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1d7d4d]" />
                <span className="text-xs font-bold text-[#171614]">Applied: {appliedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#b63a2d]" />
                <span className="text-xs font-bold text-[#171614]">Passed: {passedCount}</span>
              </div>
              <div className="text-xs text-[#8C7E74]">
                Keyboard: ← Pass · → Apply
              </div>
            </div>
          </div>

          {/* Right Column: Working Card Stack Demo */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-sm h-[440px] flex items-center justify-center">
              <AnimatePresence>
                {deck.length > 0 ? (
                  deck.map((job, index) => {
                    const isTop = index === deck.length - 1;
                    const offset = (deck.length - 1 - index) * 8;
                    const scale = 1 - (deck.length - 1 - index) * 0.04;

                    if (!isTop) {
                      return (
                        <div
                          key={job.id}
                          className="absolute w-full h-[410px] rounded-3xl bg-[#FFFDF9] border border-[#E5D9CF] p-6 shadow-md pointer-events-none"
                          style={{
                            transform: `translateY(${offset}px) scale(${scale})`,
                            zIndex: index,
                          }}
                        >
                          <div className="opacity-40 space-y-4">
                            <div className="h-6 bg-[#E5D9CF] rounded-md w-3/4" />
                            <div className="h-4 bg-[#E5D9CF]/60 rounded-md w-1/2" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        key={job.id}
                        style={{ x, rotate, opacity }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => {
                          if (info.offset.x > 90) {
                            handleSwipe('right');
                          } else if (info.offset.x < -90) {
                            handleSwipe('left');
                          }
                        }}
                        className="absolute w-full h-[410px] rounded-3xl bg-[#FFFDF9] border-2 border-[#E5D9CF] p-6 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-30 select-none overflow-hidden"
                      >
                        {/* APPLY STAMP */}
                        <motion.div
                          style={{ opacity: applyOpacity }}
                          className="absolute top-6 left-6 z-40 px-4 py-1.5 rounded-xl border-2 border-[#1d7d4d] text-[#1d7d4d] font-bold text-lg uppercase tracking-wider bg-white/90 rotate-[-12deg] shadow-sm pointer-events-none"
                        >
                          APPLY
                        </motion.div>

                        {/* PASS STAMP */}
                        <motion.div
                          style={{ opacity: passOpacity }}
                          className="absolute top-6 right-6 z-40 px-4 py-1.5 rounded-xl border-2 border-[#b63a2d] text-[#b63a2d] font-bold text-lg uppercase tracking-wider bg-white/90 rotate-[12deg] shadow-sm pointer-events-none"
                        >
                          PASS
                        </motion.div>

                        {/* Card Header */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-[#E8630A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                {job.companyMonogram}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-[#171614]">{job.companyName}</div>
                                <div className="text-[11px] text-[#62564E] flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#E8630A]" />
                                  <span>{job.city} · {job.workMode}</span>
                                </div>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF7EE] text-[#1d7d4d] border border-[#1d7d4d]/20">
                              {job.matchScore || 95}% Fit
                            </span>
                          </div>

                          <h4 className="text-xl font-editorial font-bold text-[#171614] pt-1 leading-snug">
                            {job.title}
                          </h4>

                          <div className="text-sm font-bold text-[#E8630A]">
                            ₹{job.salaryMinLpa}-{job.salaryMaxLpa} LPA
                          </div>

                          <p className="text-xs text-[#62564E] leading-relaxed line-clamp-3">
                            {job.blurb}
                          </p>
                        </div>

                        {/* Card Footer: Skill Chips */}
                        <div className="space-y-4 pt-3 border-t border-[#E5D9CF]">
                          <div className="flex flex-wrap gap-1.5">
                            {job.skills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#FAF7F2] text-[#171614] border border-[#E5D9CF]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>

                          <div className="text-[10px] text-center text-[#8C7E74]">
                            Drag right to apply · Drag left to pass
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  /* Empty state when deck is finished */
                  <div className="w-full h-[410px] rounded-3xl bg-[#FAF7F2] border-2 border-dashed border-[#E5D9CF] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-2xl bg-[#EAF7EE] text-[#1d7d4d] flex items-center justify-center font-bold">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-editorial font-bold text-[#171614]">
                        You're all caught up!
                      </h4>
                      <p className="text-xs text-[#62564E] max-w-xs">
                        You reviewed all sample recommendations in this session.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5 w-full max-w-xs">
                      <Link
                        to="/register"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 text-decoration-none shadow-sm"
                      >
                        <span>Create profile to swipe for real</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="w-full py-2 px-4 rounded-xl bg-[#FFFDF9] hover:bg-[#F4EFEA] border border-[#E5D9CF] text-xs font-medium text-[#171614] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#62564E]" />
                        <span>Reset demo deck</span>
                      </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Control Action Buttons */}
            {deck.length > 0 && (
              <div className="flex items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => handleSwipe('left')}
                  className="w-12 h-12 rounded-2xl bg-[#FFFDF9] hover:bg-[#FCEFE6] border border-[#E5D9CF] text-[#b63a2d] flex items-center justify-center shadow-sm hover:scale-105 transition-all"
                  aria-label="Pass on this job"
                >
                  <X className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="w-10 h-10 rounded-xl bg-[#FFFDF9] hover:bg-[#FAF7F2] border border-[#E5D9CF] text-[#62564E] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Undo previous action"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwipe('right')}
                  className="w-12 h-12 rounded-2xl bg-[#E8630A] hover:bg-[#D05300] text-white flex items-center justify-center shadow-md hover:scale-105 transition-all"
                  aria-label="Apply to this job"
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
