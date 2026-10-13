// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: RightRail
// Profile strength animated SVG ring, Next steps server checklist with +X% click-to-edit,
// Resume card with Preview/Download/Replace modal & "From resume - review" badges,
// and optional dismissible AI video interview card
// Recruiter views card is omitted (no backend endpoint exists)
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StrengthRing } from '../../../components/StrengthRing';
import { ResumeReplaceModal } from './ResumeReplaceModal';
import { CandidateFullProfile } from '../../../lib/types';
import { candidateApi } from '../../../lib/api';
import { toast } from '@/portals/org/ui/toast';
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Video,
  X,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const VIDEO_INTERVIEW_ENABLED = false;

export interface RightRailProps {
  profile: CandidateFullProfile;
  onOpenSection: (sectionKey: string) => void;
}

export const RightRail: React.FC<RightRailProps> = ({ profile, onOpenSection }) => {
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isVideoCardDismissed, setIsVideoCardDismissed] = useState(false);

  const score = profile.completionScore ?? 0;
  const breakdown = profile.completionBreakdown || {};

  // Build pending checklist items
  const pendingSteps = Object.entries(breakdown)
    .filter(([, data]) => !data.completed && data.weight > 0)
    .map(([key, data]) => ({
      key,
      hint: data.hint || `Add ${key}`,
      gain: data.weight - data.earned,
    }));

  const mapStepKeyToSection = (key: string): string => {
    const lower = key.toLowerCase();
    if (lower.includes('basic') || lower.includes('photo') || lower.includes('contact')) return 'profile';
    if (lower.includes('bio') || lower.includes('about') || lower.includes('summary')) return 'about';
    if (lower.includes('experience') || lower.includes('work')) return 'experience';
    if (lower.includes('education') || lower.includes('academic')) return 'education';
    if (lower.includes('skill')) return 'skills';
    if (lower.includes('project')) return 'projects';
    if (lower.includes('cert')) return 'certifications';
    if (lower.includes('lang')) return 'languages';
    if (lower.includes('pref') || lower.includes('salary')) return 'jobPreferences';
    if (lower.includes('link') || lower.includes('social')) return 'links';
    if (lower.includes('resume')) return 'resume';
    return key;
  };

  const handleDownloadResume = async () => {
    if (!profile.resume?.fileName) return;
    try {
      await candidateApi.downloadBlob(
        '/candidate/profile/resume/download',
        profile.resume.fileName,
      );
      toast.success('Resume download started.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download resume.');
    }
  };

  const unreviewedSections = profile.fromResumeSections || [];

  return (
    <div className="space-y-6">
      {/* 1. Profile Strength Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD4] p-5 sm:p-6 shadow-xs text-center">
        <h3 className="text-base font-semibold text-[#1B1A17] font-serif mb-4">
          Profile Strength
        </h3>

        <div className="flex justify-center my-2">
          <StrengthRing score={score} size={128} strokeWidth={10} />
        </div>

        <p className="text-xs text-[#5C564E] mt-3 leading-relaxed">
          {score >= 80
            ? 'Excellent! Your profile is highly visible and complete for top recruiters.'
            : score >= 50
            ? 'Good progress! Complete pending items to increase interview invitations.'
            : 'Get started! Complete your key sections to unlock personalized job recommendations.'}
        </p>
      </div>

      {/* 2. Next Steps Checklist Card */}
      {pendingSteps.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8DFD4] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">Next Steps</h3>
            <span className="text-[11px] font-semibold text-[#C2410C] bg-[#FFF1E6] px-2 py-0.5 rounded-full">
              {pendingSteps.length} pending
            </span>
          </div>

          <p className="text-xs text-[#5C564E] mb-3">
            Click any recommendation to jump straight to that section:
          </p>

          <ul className="space-y-2">
            {pendingSteps.slice(0, 5).map((step) => {
              const targetSection = mapStepKeyToSection(step.key);
              return (
                <li key={step.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (targetSection === 'resume') {
                        setIsResumeModalOpen(true);
                      } else {
                        onOpenSection(targetSection);
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-[#E8DFD4] hover:border-[#C2410C]/40 bg-[#FAF6F1]/40 hover:bg-[#FAF6F1] transition-all flex items-center justify-between gap-2 group"
                  >
                    <span className="text-xs font-medium text-[#1B1A17] group-hover:text-[#C2410C] transition-colors line-clamp-1">
                      {step.hint}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded-md border border-[#16A34A]/20">
                        +{step.gain}%
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#5C564E] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 3. Resume Rail Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD4] p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">Resume</h3>
          <FileText className="w-4 h-4 text-[#C2410C]" />
        </div>

        {profile.resume?.hasResume && profile.resume?.fileName ? (
          <div className="space-y-3.5">
            <div className="p-3 rounded-xl bg-[#FAF6F1]/50 border border-[#E8DFD4]">
              <p className="text-xs font-semibold text-[#1B1A17] truncate">
                {profile.resume.fileName}
              </p>
              {profile.resume.uploadedAt && (
                <p className="text-[11px] text-[#5C564E] mt-0.5">
                  Updated: {new Date(profile.resume.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadResume}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-[#E8DFD4] text-[#1B1A17] hover:bg-[#FAF6F1] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#5C564E]" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#FAF6F1] hover:bg-[#F2E9E0] text-[#1B1A17] border border-[#E8DFD4] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Replace</span>
              </button>
            </div>

            {/* "From resume - review" notice */}
            {unreviewedSections.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFF1E6] border border-[#C2410C]/30 text-xs">
                <div className="flex items-center gap-1.5 text-[#C2410C] font-semibold mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>From resume - review</span>
                </div>
                <p className="text-[11px] text-[#5C564E] leading-relaxed mb-2">
                  The following sections were auto-filled from your CV and need your confirmation:
                </p>
                <div className="flex flex-wrap gap-1">
                  {unreviewedSections.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onOpenSection(sec)}
                      className="text-[11px] font-semibold text-[#C2410C] bg-white px-2 py-0.5 rounded-md border border-[#C2410C]/20 hover:border-[#C2410C] transition-colors"
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-xs text-[#5C564E] mb-3">
              No resume on file. Upload your resume to enable instant 1-click applications.
            </p>
            <button
              type="button"
              onClick={() => setIsResumeModalOpen(true)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Resume</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. AI Video Interview Card (dismissible, respects VIDEO_INTERVIEW_ENABLED) */}
      {VIDEO_INTERVIEW_ENABLED && !isVideoCardDismissed && (
        <div className="bg-gradient-to-br from-[#FAF6F1] to-[#FFF1E6] rounded-2xl border border-[#E8DFD4] p-5 shadow-xs relative">
          <button
            type="button"
            onClick={() => setIsVideoCardDismissed(true)}
            aria-label="Dismiss AI video interview card"
            className="absolute top-3 right-3 p-1 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-[#C2410C] mb-2">
            <Video className="w-4 h-4" />
            <span className="text-xs font-semibold">AI Video Screening</span>
          </div>

          <h4 className="text-sm font-semibold text-[#1B1A17] font-serif">
            Practice AI Video Interview
          </h4>
          <p className="text-xs text-[#5C564E] mt-1 leading-relaxed">
            Record a short 2-minute video introduction to stand out to hiring managers.
          </p>

          <Link
            to="/candidate/onboarding"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C2410C] hover:underline"
          >
            <span>Start Practice</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Resume Replace Modal */}
      <ResumeReplaceModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
    </div>
  );
};
export default RightRail;
