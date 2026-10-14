// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: PublicProfilePage (/candidate/p/:token or /candidate/profile/preview)
// Clean, read-only Design B palette preview of candidate profile
// Strict privacy: hides phone, email, salaries, and blocked organisations
// ============================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCandidateProfile } from '../../lib/session';
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  Languages,
  Compass,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PRESET_COVERS } from '../workspace/profile/ProfileBanner';

export const PublicProfilePage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const { data: profile, isLoading } = useCandidateProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-[#E8DFD4] p-8 animate-pulse space-y-6">
          <div className="h-32 bg-[#FAF6F1] rounded-xl" />
          <div className="w-24 h-24 rounded-full bg-[#FAF6F1] -mt-16 ring-4 ring-white" />
          <div className="h-6 w-48 bg-[#FAF6F1] rounded" />
          <div className="h-4 w-72 bg-[#FAF6F1] rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FAF6F1] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8DFD4] p-8 text-center shadow-xs">
          <Lock className="w-10 h-10 text-[#5C564E] mx-auto mb-3" />
          <h2 className="text-lg font-serif font-bold text-[#1B1A17]">Profile Not Available</h2>
          <p className="text-xs text-[#5C564E] mt-1.5 leading-relaxed">
            This candidate profile link is either private or has been updated by the owner.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold transition-colors"
          >
            Explore Clyptus Careers
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.fullName || `${profile.firstName} ${profile.lastName || ''}`.trim();
  const initials = ((profile.firstName?.[0] || '') + (profile.lastName?.[0] || '')).toUpperCase() || 'C';

  // Preset cover or URL
  const isPreset = profile.coverUrl?.startsWith('preset:');
  const activePreset = isPreset
    ? PRESET_COVERS.find((p) => p.id === profile.coverUrl?.replace('preset:', ''))
    : null;

  return (
    <div className="min-h-screen bg-[#FAF6F1] text-[#1B1A17] py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Branding Bar */}
        <div className="flex items-center justify-between px-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#C2410C] flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span className="font-bold text-base text-[#1B1A17] tracking-tight">
              Clyptus <span className="text-[#C2410C] font-semibold text-xs">Verified Talent</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDF4] border border-[#16A34A]/20 text-[#16A34A] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Candidate</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E8DFD4] overflow-hidden shadow-xs">
          {/* Banner */}
          <div className="w-full h-32 sm:h-44 bg-[#F3D9C4] overflow-hidden">
            {profile.coverUrl ? (
              activePreset ? (
                <div className="w-full h-full" style={activePreset.style} />
              ) : (
                <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full bg-[#F3D9C4]" />
            )}
          </div>

          {/* Header Content */}
          <div className="px-6 pb-6 pt-0 relative border-b border-[#E8DFD4]">
            <div className="-mt-12 mb-4 w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#FAF6F1] bg-[#FFF1E6] shadow-sm flex items-center justify-center">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#C2410C] font-serif">{initials}</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1B1A17]">
              {displayName}
            </h1>
            <p className="text-sm text-[#5C564E] mt-1 max-w-2xl">{profile.headline}</p>

            <div className="flex items-center gap-2 text-xs text-[#5C564E] font-medium mt-2 flex-wrap">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#5C564E]" />
                  {profile.location}
                </span>
              )}
              {profile.openToWork && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  Open to work
                </span>
              )}
            </div>
          </div>

          {/* Body Sections */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* About */}
            {profile.bio && (
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  About
                </h3>
                <p className="text-xs sm:text-sm text-[#1B1A17] leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Target Roles & Preferences */}
            {(profile.targetRoles?.length || profile.preferredWorkModes?.length) && (
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  Preferences & Availability
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(profile.targetRoles || []).map((r) => (
                    <span key={r} className="px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E8DFD4] font-semibold text-[#1B1A17]">
                      {r}
                    </span>
                  ))}
                  {(profile.preferredWorkModes || []).map((m) => (
                    <span key={m} className="px-2.5 py-1 rounded-lg bg-[#FFF1E6] border border-[#C2410C]/20 font-semibold text-[#C2410C]">
                      {m}
                    </span>
                  ))}
                  {profile.willingToRelocate && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/20 font-semibold text-[#16A34A]">
                      Willing to relocate
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  Core Skills & Proficiencies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => {
                    const name = typeof s === 'string' ? s : s.name;
                    const level = typeof s === 'string' ? null : s.level;
                    const years = typeof s === 'string' ? null : s.years;
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/50 text-xs font-semibold text-[#1B1A17]"
                      >
                        <span>{name}</span>
                        {level && (
                          <span className="text-[10px] text-[#C2410C] bg-[#FFF1E6] px-1.5 py-0.5 rounded-md font-medium">
                            {level}
                          </span>
                        )}
                        {years && (
                          <span className="text-[10px] text-[#5C564E] font-normal">
                            {years}y
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Experience */}
            {profile.experience && profile.experience.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  Experience
                </h3>
                <div className="space-y-3.5">
                  {profile.experience.map((exp, i) => (
                    <div key={i} className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#1B1A17]">{exp.jobTitle}</h4>
                          <p className="text-xs text-[#5C564E]">{exp.company} {exp.location ? `• ${exp.location}` : ''}</p>
                        </div>
                        <span className="text-[11px] text-[#5C564E] bg-white px-2 py-0.5 rounded-md border border-[#E8DFD4]">
                          {exp.startDate || 'Past'} – {exp.currentJob ? 'Present' : exp.endDate || ''}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-xs text-[#1B1A17] mt-2 whitespace-pre-line leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  Education
                </h3>
                <div className="space-y-3">
                  {profile.education.map((edu, i) => (
                    <div key={i} className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1B1A17]">{edu.degree}</h4>
                      <p className="text-xs text-[#5C564E]">{edu.institution} {edu.startYear ? `(${edu.startYear} – ${edu.endYear})` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {profile.projects && profile.projects.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-serif font-bold text-[#1B1A17] uppercase tracking-wider text-[11px] text-[#5C564E]">
                  Projects
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.projects.map((proj, i) => (
                    <div key={i} className="p-4 rounded-xl border border-[#E8DFD4] bg-[#FAF6F1]/30 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#1B1A17]">{proj.title}</h4>
                          {proj.url && (
                            <a href={proj.url} target="_blank" rel="noreferrer" className="text-[#C2410C] hover:underline">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-xs text-[#5C564E] mt-1.5 line-clamp-3">{proj.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default PublicProfilePage;
