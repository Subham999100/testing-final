// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Profile Scoring Service
// Single source of truth for deterministic 0-100% completeness
// ============================================================

import { Injectable } from '@nestjs/common';

export interface SectionScore {
  score: number;
  max: number;
  complete: boolean;
  pending: string[];
  hint: string;
}

export interface ProfileCompletionResult {
  score: number; // 0 - 100
  breakdown: Record<string, SectionScore>;
  isComplete: boolean;
  nextMilestone: number | null; // e.g. 50, 75, 100
}

export interface CandidateScoringInput {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    isEmailVerified?: boolean | null;
  } | null;
  profile: {
    phone?: string | null;
    location?: string | null;
    headline?: string | null;
    bio?: string | null;
    photoStorageKey?: string | null;
    photoUrl?: string | null;
    education?: any;
    experience?: any;
    skills?: string[] | null;
    resumeStorageKey?: string | null;
    projects?: any;
    certifications?: any;
    languages?: any;
    preferredLocations?: string[] | null;
    preferredJobTypes?: string[] | null;
    preferredWorkModes?: string[] | null;
    socialLinks?: any;
    isFresher?: boolean | null;
  };
}

@Injectable()
export class CandidateScoringService {
  /**
   * Computes the single authoritative candidate profile completeness score (0-100).
   *
   * Scoring Weights:
   * - Basic details: 15 (Name 4, Verified email 4, Phone 4, City 3)
   * - Photo: 5
   * - Headline: 5
   * - About / summary: 5
   * - Education: 15 (>= 1 complete entry: institution + degree + valid start/end year)
   * - Work experience: 15 (Experienced: >= 1 entry; Fresher: >= 1 project/internship)
   * - Skills: 10 (>= 5 skills: 10, 3-4: 6, 1-2: 3)
   * - Resume uploaded: 10
   * - Projects: 5
   * - Certifications: 3
   * - Languages: 2
   * - Job preferences: 5 (Location 3, JobType/WorkMode 2)
   * - Social links: 5 (LinkedIn/GitHub/Portfolio)
   * Total = 100
   */
  calculateScore(input: CandidateScoringInput): ProfileCompletionResult {
    const { user, profile } = input;
    const breakdown: Record<string, SectionScore> = {};

    // 1. Basic details (15 pts)
    let basicScore = 0;
    const basicPending: string[] = [];
    const hasFullName = Boolean(
      (user?.firstName && user.firstName.trim().length >= 1) ||
      (profile as any)?.fullName?.trim(),
    );
    if (hasFullName) basicScore += 4;
    else basicPending.push('Add your full name');

    const isEmailVerified = Boolean(user?.isEmailVerified);
    if (isEmailVerified) basicScore += 4;
    else basicPending.push('Verify your email address (+4%)');

    const rawPhone = (profile.phone || '').replace(/\D/g, '');
    const hasValidPhone = rawPhone.length >= 10;
    if (hasValidPhone) basicScore += 4;
    else basicPending.push('Add valid 10-digit mobile number (+4%)');

    const hasCity = Boolean(profile.location && profile.location.trim().length >= 2);
    if (hasCity) basicScore += 3;
    else basicPending.push('Add current city (+3%)');

    breakdown.basicDetails = {
      score: basicScore,
      max: 15,
      complete: basicScore === 15,
      pending: basicPending,
      hint: '+15% Basic info',
    };

    // 2. Photo (5 pts)
    const hasPhoto = Boolean(
      (profile.photoStorageKey && profile.photoStorageKey.trim()) ||
        (profile.photoUrl && profile.photoUrl.trim()),
    );
    breakdown.photo = {
      score: hasPhoto ? 5 : 0,
      max: 5,
      complete: hasPhoto,
      pending: hasPhoto ? [] : ['Upload a professional profile photo'],
      hint: '+5% Profile photo',
    };

    // 3. Headline (5 pts: >= 10 chars)
    const hasHeadline = Boolean(
      profile.headline && profile.headline.trim().length >= 10,
    );
    breakdown.headline = {
      score: hasHeadline ? 5 : 0,
      max: 5,
      complete: hasHeadline,
      pending: hasHeadline ? [] : ['Add a descriptive headline (min 10 characters)'],
      hint: '+5% Professional headline',
    };

    // 4. About / Summary (5 pts: >= 20 chars)
    const hasBio = Boolean(profile.bio && profile.bio.trim().length >= 20);
    breakdown.about = {
      score: hasBio ? 5 : 0,
      max: 5,
      complete: hasBio,
      pending: hasBio ? [] : ['Add an about summary (min 20 characters)'],
      hint: '+5% About summary',
    };

    // 5. Education (15 pts: >= 1 complete entry: institution + degree + valid start/end year)
    let educationList: any[] = [];
    if (Array.isArray(profile.education)) {
      educationList = profile.education;
    } else if (typeof profile.education === 'string') {
      try {
        educationList = JSON.parse(profile.education);
      } catch {
        educationList = [];
      }
    }

    const hasCompleteEducation = educationList.some((e) => {
      const inst = (e.institution || '').trim();
      const deg = (e.degree || '').trim();
      if (!inst || !deg) return false;
      // Reject placeholder strings
      const isPlaceholderInst = /^(university\s*\/\s*college|unknown|n\/a|none)$/i.test(inst);
      if (isPlaceholderInst) return false;
      const start = Number(e.startYear);
      const end = Number(e.endYear);
      const hasValidYears =
        !isNaN(start) &&
        !isNaN(end) &&
        start > 1950 &&
        end >= start &&
        end <= new Date().getFullYear() + 10;
      return hasValidYears;
    });

    breakdown.education = {
      score: hasCompleteEducation ? 15 : 0,
      max: 15,
      complete: hasCompleteEducation,
      pending: hasCompleteEducation ? [] : ['Add education with degree, institution, and years'],
      hint: '+15% Education',
    };

    // 6. Work experience OR Fresher with >= 1 project/internship (15 pts)
    const isFresher = Boolean(profile.isFresher);
    let hasExperience = false;

    let expList: any[] = [];
    if (Array.isArray(profile.experience)) {
      expList = profile.experience;
    } else if (typeof profile.experience === 'string') {
      try {
        expList = JSON.parse(profile.experience);
      } catch {
        expList = [];
      }
    }

    let projectList: any[] = [];
    if (Array.isArray(profile.projects)) {
      projectList = profile.projects;
    } else if (typeof profile.projects === 'string') {
      try {
        projectList = JSON.parse(profile.projects);
      } catch {
        projectList = [];
      }
    }

    if (isFresher) {
      // For freshers, 1 real project or internship completes the experience requirement
      const hasProjectOrInternship =
        projectList.some((p) => {
          const t = (p.title || '').trim();
          return t.length >= 3 && !/^(project|academic project|unknown|n\/a)$/i.test(t);
        }) ||
        expList.some((e) => {
          const role = (e.jobTitle || e.title || e.role || '').trim();
          const comp = (e.company || e.organisation || e.organization || '').trim();
          return (
            role.length >= 2 &&
            comp.length >= 2 &&
            !/^(organisation|organization|company|unknown|n\/a)$/i.test(comp)
          );
        });
      hasExperience = hasProjectOrInternship;
    } else {
      // For experienced candidates, >= 1 valid work experience entry required (reject placeholders)
      hasExperience = expList.some((e) => {
        const title = (e.jobTitle || e.title || e.designation || '').trim();
        const comp = (e.company || e.organisation || e.organization || '').trim();
        const isPlaceholderComp = /^(organisation|organization|company|unknown|n\/a)$/i.test(comp);
        const isPlaceholderTitle = /^(unknown|n\/a|title|role)$/i.test(title);
        return title.length >= 2 && !isPlaceholderTitle && comp.length >= 2 && !isPlaceholderComp;
      });
    }

    breakdown.experience = {
      score: hasExperience ? 15 : 0,
      max: 15,
      complete: hasExperience,
      pending: hasExperience
        ? []
        : [isFresher ? 'Add an academic or personal project' : 'Add your work experience'],
      hint: '+15% Work experience',
    };

    // 7. Skills (10 pts: >= 5 skills -> 10, 3-4 -> 6, 1-2 -> 3)
    const validSkills = (profile.skills || []).filter(
      (s) => typeof s === 'string' && s.trim().length > 0,
    );
    let skillsScore = 0;
    if (validSkills.length >= 5) skillsScore = 10;
    else if (validSkills.length >= 3) skillsScore = 6;
    else if (validSkills.length >= 1) skillsScore = 3;

    breakdown.skills = {
      score: skillsScore,
      max: 10,
      complete: skillsScore === 10,
      pending:
        validSkills.length < 5
          ? [`Add ${5 - validSkills.length} more skills (min 5)`]
          : [],
      hint: '+10% Key skills',
    };

    // 8. Resume uploaded (10 pts)
    const hasResume = Boolean(
      profile.resumeStorageKey && profile.resumeStorageKey.trim(),
    );
    breakdown.resume = {
      score: hasResume ? 10 : 0,
      max: 10,
      complete: hasResume,
      pending: hasResume ? [] : ['Upload your resume to secure vault'],
      hint: '+10% Resume',
    };

    // 9. Projects (5 pts: >= 1 valid project with title & description)
    const hasProjects = projectList.some(
      (p) => Boolean(p.title && p.title.trim()),
    );
    breakdown.projects = {
      score: hasProjects ? 5 : 0,
      max: 5,
      complete: hasProjects,
      pending: hasProjects ? [] : ['Add a project (+5%)'],
      hint: '+5% Projects',
    };

    // 10. Certifications (3 pts)
    let certList: any[] = [];
    if (Array.isArray(profile.certifications)) {
      certList = profile.certifications;
    } else if (typeof profile.certifications === 'string') {
      try {
        certList = JSON.parse(profile.certifications);
      } catch {
        certList = [];
      }
    }
    const hasCerts = certList.some(
      (c) => Boolean(c.name && c.name.trim()),
    );
    breakdown.certifications = {
      score: hasCerts ? 3 : 0,
      max: 3,
      complete: hasCerts,
      pending: hasCerts ? [] : ['Add certifications (+3%)'],
      hint: '+3% Certifications',
    };

    // 11. Languages (2 pts: >= 1 language)
    let langList: any[] = [];
    if (Array.isArray(profile.languages)) {
      langList = profile.languages;
    } else if (typeof profile.languages === 'string') {
      try {
        langList = JSON.parse(profile.languages);
      } catch {
        langList = [];
      }
    }
    const hasLangs = langList.some(
      (l) => Boolean((typeof l === 'string' ? l : l.name || l.language)?.trim()),
    );
    breakdown.languages = {
      score: hasLangs ? 2 : 0,
      max: 2,
      complete: hasLangs,
      pending: hasLangs ? [] : ['Add known languages (+2%)'],
      hint: '+2% Languages',
    };

    // 12. Job preferences (5 pts: Location 3 pts, JobType/WorkMode 2 pts)
    let prefScore = 0;
    const prefPending: string[] = [];
    const hasPrefLocations = Boolean(
      profile.preferredLocations && profile.preferredLocations.length > 0,
    );
    if (hasPrefLocations) prefScore += 3;
    else prefPending.push('Add preferred job locations (+3%)');

    const hasPrefTypesOrModes = Boolean(
      (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) ||
        (profile.preferredWorkModes && profile.preferredWorkModes.length > 0),
    );
    if (hasPrefTypesOrModes) prefScore += 2;
    else prefPending.push('Select preferred work mode or job type (+2%)');

    breakdown.jobPreferences = {
      score: prefScore,
      max: 5,
      complete: prefScore === 5,
      pending: prefPending,
      hint: '+5% Job preferences',
    };

    // 13. Social links (5 pts: LinkedIn, GitHub, or Portfolio)
    let socialLinksObj: Record<string, string> = {};
    if (profile.socialLinks && typeof profile.socialLinks === 'object') {
      socialLinksObj = profile.socialLinks;
    } else if (typeof profile.socialLinks === 'string') {
      try {
        socialLinksObj = JSON.parse(profile.socialLinks);
      } catch {
        socialLinksObj = {};
      }
    }
    const hasSocialLink = Boolean(
      (socialLinksObj.linkedin && socialLinksObj.linkedin.trim()) ||
        (socialLinksObj.github && socialLinksObj.github.trim()) ||
        (socialLinksObj.portfolio && socialLinksObj.portfolio.trim()) ||
        (socialLinksObj.twitter && socialLinksObj.twitter.trim()),
    );
    breakdown.socialLinks = {
      score: hasSocialLink ? 5 : 0,
      max: 5,
      complete: hasSocialLink,
      pending: hasSocialLink ? [] : ['Add LinkedIn or GitHub link (+5%)'],
      hint: '+5% Social links',
    };

    // Calculate total score
    let totalScore = 0;
    for (const key of Object.keys(breakdown)) {
      totalScore += breakdown[key].score;
    }
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Next milestone
    let nextMilestone: number | null = null;
    if (totalScore < 50) nextMilestone = 50;
    else if (totalScore < 75) nextMilestone = 75;
    else if (totalScore < 100) nextMilestone = 100;

    return {
      score: totalScore,
      breakdown,
      isComplete: totalScore === 100,
      nextMilestone,
    };
  }
}
