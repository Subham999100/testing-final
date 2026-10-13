// ============================================================
// Clyptus Job Portal - Candidate Portal
// Step 5: AI Video Interview (Feature flag stub & Skip flow)
// Feature flag: VIDEO_INTERVIEW_ENABLED=false
// Skip sets status SKIPPED, completes onboarding, redirects to /candidate/profile
// ============================================================

import React from 'react';
import { Button } from '@/portals/org/ui/ui';
import { Video, Sparkles, Clock, Camera, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Step5VideoInterviewProps {
  onStart: () => Promise<void>;
  onSkip: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

// Global or environment feature flag
const VIDEO_INTERVIEW_ENABLED = false;

export const Step5VideoInterview: React.FC<Step5VideoInterviewProps> = ({
  onStart,
  onSkip,
  onBack,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-serif text-slate-900">AI Video Interview</h2>
        <p className="text-sm text-slate-500 mt-1">
          Complete an optional 5-minute automated interview to boost your profile ranking with Indian hiring teams.
        </p>
      </div>

      {/* Main Intro Card */}
      <div className="bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 border border-orange-200/70 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Video className="w-6 h-6" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>3x Profile Visibility</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Showcase Your Communication & Technical Foundations
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Answer 3 role-relevant behavioral and problem-solving questions. Recruiters prioritize candidates with completed video assessments.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>~5 Minutes Total</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Quick, self-paced, and can be retaken if needed.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Camera className="w-4 h-4 text-orange-600" />
              <span>Camera & Mic Ready</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Requires a working webcam, microphone, and quiet room.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Private to Recruiters</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Never shared publicly or published online.
            </p>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {/* Primary Start Button: Disabled / Coming Soon behind flag */}
          <div className="w-full sm:w-auto relative group">
            <Button
              type="button"
              variant="primary"
              disabled={!VIDEO_INTERVIEW_ENABLED || isLoading}
              onClick={onStart}
              className={`w-full sm:w-auto px-6 py-2.5 font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 ${
                !VIDEO_INTERVIEW_ENABLED
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <span>Start Interview</span>
              {!VIDEO_INTERVIEW_ENABLED && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-300 text-slate-700 ml-1">
                  Coming Soon
                </span>
              )}
            </Button>
          </div>

          {/* Primary Skip for Now Button */}
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading}
            onClick={onSkip}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold flex items-center justify-center gap-2"
          >
            <span>Skip for now</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-slate-400 italic">
          You can always complete your video interview later from your profile dashboard.
        </p>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg border-slate-300 text-slate-700"
          disabled={isLoading}
        >
          Back
        </Button>

        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading}
          className="text-xs font-semibold text-slate-600 hover:text-orange-600 transition-colors"
        >
          Skip & Finish Onboarding →
        </button>
      </div>
    </div>
  );
};
