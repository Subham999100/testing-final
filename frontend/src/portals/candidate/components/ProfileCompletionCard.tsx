// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: ProfileCompletionCard
// Server-calculated profile score (0-100%), animated bar, and clickable pending checklist
// ============================================================

import React from 'react';
import { CheckCircle2, Circle, Sparkles, ChevronRight, Award } from 'lucide-react';

export interface ProfileCompletionItem {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
  hint: string;
  targetSectionId: string;
}

interface ProfileCompletionCardProps {
  score: number;
  breakdown?: Record<string, { weight: number; earned: number; completed: boolean; hint: string }>;
  onItemClick: (sectionId: string) => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  score = 0,
  breakdown = {},
  onItemClick,
}) => {
  // Ordered checklist matching server scoring weights
  const checklistItems: ProfileCompletionItem[] = [
    {
      key: 'basicDetails',
      label: 'Basic Details',
      weight: 15,
      completed: breakdown.basicDetails?.completed ?? false,
      hint: 'Add name, phone, verified email and city',
      targetSectionId: 'section-contact',
    },
    {
      key: 'education',
      label: 'Education',
      weight: 15,
      completed: breakdown.education?.completed ?? false,
      hint: 'Add at least 1 degree with college and years',
      targetSectionId: 'section-education',
    },
    {
      key: 'experience',
      label: 'Work Experience / Internship',
      weight: 15,
      completed: breakdown.experience?.completed ?? false,
      hint: 'Add job title & company or fresher project',
      targetSectionId: 'section-experience',
    },
    {
      key: 'skills',
      label: 'Key Skills (>=5)',
      weight: 10,
      completed: breakdown.skills?.completed ?? false,
      hint: 'Add 5 or more technical skills',
      targetSectionId: 'section-skills',
    },
    {
      key: 'resume',
      label: 'Resume Document',
      weight: 10,
      completed: breakdown.resume?.completed ?? false,
      hint: 'Upload your latest resume document',
      targetSectionId: 'section-resume',
    },
    {
      key: 'headline',
      label: 'Resume Headline',
      weight: 5,
      completed: breakdown.headline?.completed ?? false,
      hint: 'Add a 10-120 character professional headline',
      targetSectionId: 'section-about',
    },
    {
      key: 'about',
      label: 'Summary / Bio',
      weight: 5,
      completed: breakdown.about?.completed ?? false,
      hint: 'Write a brief professional summary',
      targetSectionId: 'section-about',
    },
    {
      key: 'photo',
      label: 'Profile Photo',
      weight: 5,
      completed: breakdown.photo?.completed ?? false,
      hint: 'Upload a clear portrait photo',
      targetSectionId: 'section-header',
    },
    {
      key: 'preferences',
      label: 'Job Preferences',
      weight: 5,
      completed: breakdown.preferences?.completed ?? false,
      hint: 'Specify preferred locations and salary',
      targetSectionId: 'section-preferences',
    },
    {
      key: 'socialLinks',
      label: 'Social & Portfolio Links',
      weight: 5,
      completed: breakdown.socialLinks?.completed ?? false,
      hint: 'Add your LinkedIn or GitHub profile',
      targetSectionId: 'section-links',
    },
    {
      key: 'projects',
      label: 'Key Projects',
      weight: 5,
      completed: breakdown.projects?.completed ?? false,
      hint: 'Add academic or commercial projects',
      targetSectionId: 'section-projects',
    },
    {
      key: 'certifications',
      label: 'Certifications',
      weight: 3,
      completed: breakdown.certifications?.completed ?? false,
      hint: 'Add professional credentials',
      targetSectionId: 'section-certifications',
    },
    {
      key: 'languages',
      label: 'Languages',
      weight: 2,
      completed: breakdown.languages?.completed ?? false,
      hint: 'Add spoken languages',
      targetSectionId: 'section-languages',
    },
  ];

  const pendingItems = checklistItems.filter((i) => !i.completed);
  const completedItems = checklistItems.filter((i) => i.completed);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header & Score Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Profile Strength</h3>
              <p className="text-xs text-slate-500">
                Calculated strictly by verified profile sections
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-serif text-slate-900 tracking-tight">
              {score}%
            </span>
            <span className="text-xs text-slate-400 block font-medium">Complete</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-orange-500 to-amber-500"
            style={{ width: `${Math.max(4, score)}%` }}
          />
        </div>
      </div>

      {/* Pending Items Checklist */}
      {pendingItems.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Pending Sections to Boost Your Profile:
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {pendingItems.length} remaining
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pendingItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onItemClick(item.targetSectionId)}
                className="group p-3 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-orange-50/50 hover:border-orange-300 text-left transition-all flex items-center justify-between shadow-2xs cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <Circle className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-orange-950 transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {item.hint}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2">
                  <span className="text-xs font-bold text-orange-600 px-1.5 py-0.5 rounded-md bg-orange-100/70">
                    +{item.weight}%
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completed Items Summary */}
      {completedItems.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mb-2 block">
            Completed Sections ({completedItems.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {completedItems.map((item) => (
              <span
                key={item.key}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
