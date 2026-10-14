// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: VideoInterviewModal
// "Coming Soon" placeholder modal for 15-minute timed AI Video Interview
// ============================================================

import React from 'react';
import {
  Bot,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';

interface VideoInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoInterviewModal: React.FC<VideoInterviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-[#E8DFD4] shadow-2xl overflow-hidden text-[#1B1A17]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD4] bg-[#FAF6F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C]">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h3 id="interview-modal-title" className="text-base font-serif font-semibold text-[#1B1A17]">
                AI Video Interview
              </h3>
              <p className="text-xs text-[#5C564E]">15-minute timed AI interview</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#E8DFD4]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF1E6] border border-[#FDBA74]/50 flex items-center justify-center text-[#C2410C] mx-auto shadow-xs">
            <Bot className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/20">
              <Sparkles className="w-3 h-3" /> Coming Soon
            </span>
            <h4 className="text-lg font-serif font-semibold text-[#1B1A17]">
              Interactive AI Interview Simulation
            </h4>
            <p className="text-xs text-[#5C564E] leading-relaxed max-w-sm mx-auto">
              We are finalizing our 15-minute interactive AI video interview experience with dynamic technical and behavioral questions tailored to your target job profile.
            </p>
          </div>

          <div className="text-left p-3.5 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] space-y-2 text-xs text-[#5C564E]">
            <div className="font-semibold text-[#1B1A17]">What to expect:</div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>5 core questions in a 15-minute structured round</span>
            </div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Real-time speech & communication clarity feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Verified badge highlighted directly on recruiter candidate search</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E8DFD4] bg-[#FAF6F1] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Got it, thanks
          </button>
        </div>
      </div>
    </div>
  );
};
