// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Page: ProfilePage
// Rebuilt as LinkedIn-style Design B layout:
// Banner (4:1) -> Overlapping Header -> 2-Column Grid (Main 1fr + 300px Right Rail)
// Modular sections: About | Experience | Education | Skills | Projects | Certifications | Languages | Job Preferences | Links | Privacy
// VIEW mode by default with per-section accessible edit modals and optimistic updates
// Zero floating action bars or duplicate forms
// ============================================================

import React, { useRef } from 'react';
import { useCandidateProfile } from '../../lib/session';
import { ProfileBanner } from './profile/ProfileBanner';
import { ProfileHeader } from './profile/ProfileHeader';
import { AboutSection } from './profile/sections/AboutSection';
import { ExperienceSection } from './profile/sections/ExperienceSection';
import { EducationSection } from './profile/sections/EducationSection';
import { SkillsSection } from './profile/sections/SkillsSection';
import { ProjectsSection } from './profile/sections/ProjectsSection';
import { CertificationsSection } from './profile/sections/CertificationsSection';
import { LanguagesSection } from './profile/sections/LanguagesSection';
import { JobPreferencesSection } from './profile/sections/JobPreferencesSection';
import { LinksSection } from './profile/sections/LinksSection';
import { PrivacySection } from './profile/sections/PrivacySection';
import { RightRail } from './profile/RightRail';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { data: profile, isLoading, isError, error, refetch } = useCandidateProfile();

  // Refs for scrolling to target sections from Next Steps rail
  const aboutRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const certificationsRef = useRef<HTMLDivElement>(null);
  const languagesRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const handleOpenSection = (sectionKey: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement>> = {
      about: aboutRef,
      experience: experienceRef,
      education: educationRef,
      skills: skillsRef,
      projects: projectsRef,
      certifications: certificationsRef,
      languages: languagesRef,
      jobPreferences: preferencesRef,
      links: linksRef,
    };

    const target = map[sectionKey];
    if (target?.current) {
      target.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Find the Edit button inside and focus or trigger it
      const editBtn = target.current.querySelector<HTMLButtonElement>('button[aria-label^="Edit"]');
      if (editBtn) {
        editBtn.click();
      }
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        <div className="bg-white rounded-2xl border border-[#E8DFD4] overflow-hidden shadow-xs">
          <div className="w-full h-[100px] sm:h-[140px] md:h-[200px] bg-[#FAF6F1] animate-pulse" />
          <div className="p-6">
            <div className="-mt-12 mb-4 w-24 h-24 rounded-full bg-[#FAF6F1] animate-pulse ring-4 ring-[#FAF6F1]" />
            <div className="h-6 w-48 bg-[#FAF6F1] animate-pulse rounded mb-2" />
            <div className="h-4 w-72 bg-[#FAF6F1] animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !profile) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-[#E8DFD4] text-center shadow-xs">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
        <h2 className="text-base font-semibold text-[#1B1A17] font-serif">
          Unable to Load Profile
        </h2>
        <p className="text-xs text-[#5C564E] mt-1.5 leading-relaxed">
          {(error as any)?.message || 'Something went wrong while loading your profile data.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 text-[#1B1A17] font-sans">
      {/* Top Profile Card (LinkedIn style: 4:1 Banner + Overlapping Header) */}
      <div className="bg-white rounded-2xl border border-[#E8DFD4] overflow-hidden shadow-xs">
        <ProfileBanner coverUrl={profile.coverUrl} />
        <ProfileHeader profile={profile} />
      </div>

      {/* Two Column Layout (1fr + 300px Right Rail; rail drops below on < 1100px) */}
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-[1fr_300px] gap-6 items-start">
        {/* MAIN COLUMN (Sections in required order) */}
        <main className="space-y-6 min-w-0">
          {/* 1. About */}
          <div ref={aboutRef}>
            <AboutSection profile={profile} />
          </div>

          {/* 2. Experience */}
          <div ref={experienceRef}>
            <ExperienceSection profile={profile} />
          </div>

          {/* 3. Education */}
          <div ref={educationRef}>
            <EducationSection profile={profile} />
          </div>

          {/* 4. Skills */}
          <div ref={skillsRef}>
            <SkillsSection profile={profile} />
          </div>

          {/* 5. Projects */}
          <div ref={projectsRef}>
            <ProjectsSection profile={profile} />
          </div>

          {/* 6. Certifications */}
          <div ref={certificationsRef}>
            <CertificationsSection profile={profile} />
          </div>

          {/* 7. Languages */}
          <div ref={languagesRef}>
            <LanguagesSection profile={profile} />
          </div>

          {/* 8. Job Preferences */}
          <div ref={preferencesRef}>
            <JobPreferencesSection profile={profile} />
          </div>

          {/* 9. Links */}
          <div ref={linksRef}>
            <LinksSection profile={profile} />
          </div>

          {/* 10. Privacy */}
          <div>
            <PrivacySection profile={profile} />
          </div>
        </main>

        {/* RIGHT RAIL */}
        <aside className="space-y-6 min-w-0" aria-label="Profile actions and strength">
          <RightRail profile={profile} onOpenSection={handleOpenSection} />
        </aside>
      </div>
    </div>
  );
};
export default ProfilePage;
