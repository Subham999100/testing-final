// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Resume Parser Service
// Rule-based resume extraction engine with AI adapter placeholder
// Quality rules:
// - Map education into structured institution/degree/field/years/grade
// - Strip section prefixes from skills (e.g. "Frameworks TensorFlow" -> "TensorFlow")
// - Split compound skills & dedupe case-insensitively
// - Ignore placeholder dates (1970, 0000)
// - Merge rules: only fill EMPTY profile fields, never overwrite user input
// ============================================================

import { Injectable, Logger } from '@nestjs/common';

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
}

export interface ParsedExperience {
  jobTitle: string;
  company: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  currentJob?: boolean;
  description?: string;
}

export interface ParsedProject {
  title: string;
  description?: string;
  technologies?: string[];
  url?: string;
}

export interface ParsedCertification {
  name: string;
  issuer?: string;
  year?: number;
}

export interface ParsedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  skills: string[];
  education: ParsedEducation[];
  experience: ParsedExperience[];
  projects: ParsedProject[];
  certifications: ParsedCertification[];
  languages: string[];
  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}

export interface IResumeParser {
  parse(text: string): Promise<ParsedResumeData>;
}

@Injectable()
export class ResumeParserService implements IResumeParser {
  private readonly logger = new Logger(ResumeParserService.name);

  // Common section prefixes that leak into skill items (e.g. "Frameworks TensorFlow" or "Tools: Docker")
  private readonly skillSectionPrefixes = [
    /^(?:Technical\s+Skills?|Key\s+Skills?|Core\s+Competencies|Core\s+Concepts?|Frameworks?(?:\s*&\s*Libraries)?|Libraries?|Tools?(?:\s*&\s*(?:Platforms|Technologies))?|Platforms?|Languages?(?:\s*&\s*Frameworks)?|Databases?|Platforms?|Methodologies?|Technologies?|Concepts?|OS|Operating\s+Systems?|Backend|Frontend|DevOps|Cloud|Programming(?:\s+Languages?)?)[:\s-]+/i,
    /^(?:Proficient\s+in|Experienced\s+with|Knowledge\s+of|Working\s+knowledge\s+of)[:\s-]+/i,
  ];

  // Common Indian & global degree keywords
  private readonly degreeKeywords = [
    { pattern: /\b(?:B\.?Tech|Bachelor of Technology)\b/i, degree: 'B.Tech' },
    { pattern: /\b(?:B\.?E\.?|Bachelor of Engineering)\b/i, degree: 'B.E.' },
    { pattern: /\b(?:M\.?Tech|Master of Technology)\b/i, degree: 'M.Tech' },
    { pattern: /\b(?:M\.?E\.?|Master of Engineering)\b/i, degree: 'M.E.' },
    { pattern: /\b(?:M\.?B\.?A\.?|Master of Business Administration)\b/i, degree: 'MBA' },
    { pattern: /\b(?:B\.?B\.?A\.?|Bachelor of Business Administration)\b/i, degree: 'BBA' },
    { pattern: /\b(?:B\.?C\.?A\.?|Bachelor of Computer Applications)\b/i, degree: 'BCA' },
    { pattern: /\b(?:M\.?C\.?A\.?|Master of Computer Applications)\b/i, degree: 'MCA' },
    { pattern: /\b(?:B\.?Sc|Bachelor of Science)\b/i, degree: 'B.Sc' },
    { pattern: /\b(?:M\.?Sc|Master of Science)\b/i, degree: 'M.Sc' },
    { pattern: /\b(?:B\.?Com|Bachelor of Commerce)\b/i, degree: 'B.Com' },
    { pattern: /\b(?:Ph\.?D\.?|Doctor of Philosophy|Doctorate)\b/i, degree: 'Ph.D.' },
    { pattern: /\b(?:Diploma)\b/i, degree: 'Diploma' },
    { pattern: /\b(?:Senior Secondary|12th Standard|Class XII|Intermediate|HSC)\b/i, degree: '12th' },
    { pattern: /\b(?:Secondary School|10th Standard|Class X|Matriculation|SSC)\b/i, degree: '10th' },
  ];

  private readonly fieldsOfStudy = [
    'Computer Science',
    'Information Technology',
    'Electronics and Communication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Artificial Intelligence',
    'Data Science',
    'Software Engineering',
    'Business Administration',
    'Finance',
    'Marketing',
    'Human Resources',
    'Commerce',
  ];

  /**
   * Main entry point for resume parsing.
   * Tolerant and robust: will never crash on malformed resumes.
   */
  async parse(text: string): Promise<ParsedResumeData> {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return this.emptyParsedData();
    }

    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

    return {
      fullName: this.extractFullName(lines),
      email: this.extractEmail(cleanText),
      phone: this.extractPhone(cleanText),
      location: this.extractLocation(cleanText),
      headline: this.extractHeadline(lines),
      summary: this.extractSummary(cleanText),
      skills: this.extractSkills(cleanText),
      education: this.extractEducation(cleanText),
      experience: this.extractExperience(cleanText),
      projects: this.extractProjects(cleanText),
      certifications: this.extractCertifications(cleanText),
      languages: this.extractLanguages(cleanText),
      links: this.extractLinks(cleanText),
    };
  }

  private emptyParsedData(): ParsedResumeData {
    return {
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      languages: [],
      links: {},
    };
  }

  /**
   * Extracts candidate email address
   */
  private extractEmail(text: string): string | undefined {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : undefined;
  }

  /**
   * Extracts phone number (Indian +91 format prioritized)
   */
  private extractPhone(text: string): string | undefined {
    const indianMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/);
    if (indianMatch) {
      return indianMatch[0].replace(/[\s-]/g, '').replace(/^\+91/, '');
    }
    const globalMatch = text.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    return globalMatch ? globalMatch[0].trim() : undefined;
  }

  /**
   * Extracts candidate full name from header/top lines
   */
  private extractFullName(lines: string[]): string | undefined {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      // Skip if it contains email or website or is all numbers
      if (line.includes('@') || line.includes('http') || line.includes('www.') || line.includes('+')) {
        continue;
      }
      // Looks like a name: 2 to 4 words, alphabetic only
      if (/^[A-Za-z\s.'-]{3,50}$/.test(line)) {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && words.length <= 4) {
          return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      }
    }
    return undefined;
  }

  /**
   * Extracts Indian location (City, State)
   */
  private extractLocation(text: string): string | undefined {
    const majorCities = [
      'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'New Delhi', 'Hyderabad',
      'Pune', 'Chennai', 'Gurugram', 'Gurgaon', 'Noida', 'Kolkata', 'Ahmedabad',
      'Jaipur', 'Chandigarh', 'Kochi', 'Indore', 'Bhopal', 'Nagpur', 'Lucknow',
    ];

    for (const city of majorCities) {
      const regex = new RegExp(`\\b${city}\\b`, 'i');
      if (regex.test(text)) {
        return city === 'Bangalore' ? 'Bengaluru' : city === 'Gurgaon' ? 'Gurugram' : city;
      }
    }
    return undefined;
  }

  /**
   * Extracts professional headline
   */
  private extractHeadline(lines: string[]): string | undefined {
    const headlineKeywords = [
      'software engineer', 'full stack developer', 'frontend engineer',
      'backend developer', 'data scientist', 'product manager', 'devops engineer',
      'ui/ux designer', 'qa engineer', 'system architect', 'cloud engineer',
    ];

    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      const line = lines[i].toLowerCase();
      for (const kw of headlineKeywords) {
        if (line.includes(kw) && lines[i].length <= 100) {
          return lines[i].trim();
        }
      }
    }
    return undefined;
  }

  /**
   * Extracts summary / about section
   */
  private extractSummary(text: string): string | undefined {
    const summaryMatch = text.match(
      /(?:summary|profile|about me|professional summary|executive summary)[:\s]*\n([\s\S]{30,450}?)(?:\n\s*\n|\b(?:experience|education|skills|projects|certifications)\b)/i,
    );
    if (summaryMatch && summaryMatch[1]) {
      return summaryMatch[1].replace(/\s+/g, ' ').trim();
    }
    return undefined;
  }

  /**
   * Extracts skills with rigorous cleaning:
   * 1. Strip section headings (e.g. "Frameworks TensorFlow" -> "TensorFlow")
   * 2. Split compound skills (e.g. "Node.js / Express, React & Redux")
   * 3. Dedupe case-insensitively
   */
  extractSkills(text: string): string[] {
    const rawSkills: string[] = [];

    // Find skills section
    const sectionMatch = text.match(
      /(?:technical skills|skills & abilities|key skills|skills|technologies|core competencies)[:\s]*\n([\s\S]*?)(?=(?:\n\s*\n\s*[A-Z]|\b(?:experience|education|projects|certifications|employment|work history)\b|$))/i,
    );

    const skillsBlock = sectionMatch ? sectionMatch[1] : text;

    // Common skill taxonomy
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'React', 'Redux', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Prisma', 'TypeORM', 'SQL',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub', 'Linux', 'Terraform',
      'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind CSS', 'GraphQL', 'REST API', 'Microservices', 'System Design',
      'TensorFlow', 'PyTorch', 'Scikit-learn', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
      'Jest', 'Cypress', 'Playwright', 'Vitest', 'Figma', 'Agile', 'Scrum', 'Data Structures & Algorithms',
    ];

    // Detect known skills from text
    for (const skill of commonSkills) {
      const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
      if (regex.test(skillsBlock)) {
        rawSkills.push(skill);
      }
    }

    // Also process any comma/bullet separated items in skills section
    if (sectionMatch) {
      const items = skillsBlock.split(/[\n,•|·;]+/);
      for (let item of items) {
        let clean = item.trim();
        // If line contains colon (e.g. "Programming: Python" or "Tools: Git"), strip heading prefix before colon
        if (clean.includes(':')) {
          const parts = clean.split(':');
          clean = parts.slice(1).join(':').trim();
        }
        // Strip section prefixes (e.g. "Frameworks TensorFlow" -> "TensorFlow")
        for (const prefix of this.skillSectionPrefixes) {
          clean = clean.replace(prefix, '').trim();
        }
        // Split compound skills (e.g. "React / Redux" -> "React", "Redux")
        const subItems = clean.split(/\s*[/&,]\s*/);
        for (const sub of subItems) {
          const trimmed = sub.trim();
          // Filter out standalone category headings and noise
          const isHeading = /^(?:technical\s+skills?|skills\s*&\s*abilities|key\s+skills?|skills|technologies|core\s+competencies|core\s+concepts?|tools\s*&\s*platforms|tools\s*&\s*technologies|programming|frameworks\s*&\s*libraries|frameworks|libraries|tools|platforms|databases|languages)$/i.test(trimmed);
          if (isHeading) continue;
          if (trimmed.length >= 2 && trimmed.length <= 40 && !/^(and|or|with|the)$/i.test(trimmed)) {
            rawSkills.push(trimmed);
          }
        }
      }
    }

    // Deduplicate case-insensitively and canonicalize against taxonomy
    const seen = new Set<string>();
    const deduplicated: string[] = [];
    const taxonomyMap = new Map<string, string>();
    for (const sk of commonSkills) {
      taxonomyMap.set(sk.toLowerCase(), sk);
    }

    for (const s of rawSkills) {
      const lower = s.toLowerCase();
      if (!seen.has(lower) && s.length >= 2 && s.length <= 40) {
        seen.add(lower);
        const canonical = taxonomyMap.get(lower) || s;
        deduplicated.push(canonical);
      }
    }

    return deduplicated.slice(0, 30);
  }

  /**
   * Extracts education:
   * Maps strictly into institution/degree/field/years/grade.
   * Never dumps raw text block into description.
   * Ignores placeholder dates (1970, 0000).
   */
  extractEducation(text: string): ParsedEducation[] {
    const educations: ParsedEducation[] = [];

    // Look for degree patterns
    for (const deg of this.degreeKeywords) {
      const match = text.match(deg.pattern);
      if (match && match.index !== undefined) {
        // Look within surrounding context (approx 150 chars around match)
        const contextStart = Math.max(0, match.index - 80);
        const contextEnd = Math.min(text.length, match.index + 150);
        const context = text.slice(contextStart, contextEnd);

        // Find years: e.g. 2018 - 2022 or 2020
        const yearMatches = context.match(/\b(19\d{2}|20\d{2})\b/g);
        let startYear: number | undefined;
        let endYear: number | undefined;

        if (yearMatches) {
          const validYears = yearMatches
            .map((y) => parseInt(y, 10))
            .filter((y) => y >= 1980 && y <= 2035 && y !== 1970); // Ignore placeholder years

          if (validYears.length === 1) {
            endYear = validYears[0];
          } else if (validYears.length >= 2) {
            startYear = Math.min(validYears[0], validYears[1]);
            endYear = Math.max(validYears[0], validYears[1]);
          }
        }

        // Find institution
        let institution = '';
        const instMatch = context.match(
          /(?:[A-Z][a-zA-Z&.\s]+(?:University|Institute|College|Academy|School|IIT|NIT|BITS|IIIT)[a-zA-Z&.\s]*)/,
        );
        if (instMatch) {
          institution = instMatch[0].replace(/\s+/g, ' ').trim().slice(0, 80);
        }

        // Never emit placeholder "University / College"
        if (!institution || /^(university\s*\/\s*college|unknown|n\/a)$/i.test(institution.trim())) {
          institution = '';
        }

        // Find field of study
        let fieldOfStudy: string | undefined;
        for (const fos of this.fieldsOfStudy) {
          if (new RegExp(`\\b${fos}\\b`, 'i').test(context)) {
            fieldOfStudy = fos;
            break;
          }
        }

        // Find grade/percentage/CGPA
        let grade: string | undefined;
        const gradeMatch = context.match(/(?:\b\d{1,2}(?:\.\d{1,2})?\s*(?:%|CGPA|GPA)|\bCGPA\s*:\s*\d{1,2}(?:\.\d{1,2})?)/i);
        if (gradeMatch) {
          grade = gradeMatch[0].trim();
        }

        educations.push({
          degree: deg.degree,
          institution,
          fieldOfStudy: fieldOfStudy || undefined,
          startYear,
          endYear,
          grade,
        });

        // Cap to top 3 entries
        if (educations.length >= 3) break;
      }
    }

    return educations;
  }

  /**
   * Extracts work experience
   */
  private extractExperience(text: string): ParsedExperience[] {
    const experiences: ParsedExperience[] = [];
    const expMatch = text.match(
      /(?:work experience|professional experience|experience|employment)[:\s]*\n([\s\S]{30,1200}?)(?:\n\s*\n|\b(?:education|projects|certifications|skills)\b)/i,
    );

    if (expMatch && expMatch[1]) {
      const expBlock = expMatch[1];
      const jobTitles = [
        'Software Engineer', 'Full Stack Developer', 'Frontend Developer',
        'Backend Developer', 'Software Developer', 'Intern', 'Software Engineering Intern',
        'Associate Software Engineer', 'Senior Software Engineer', 'Tech Lead',
      ];

      for (const title of jobTitles) {
        const regex = new RegExp(`\\b${title}\\b`, 'i');
        const match = expBlock.match(regex);
        if (match && match.index !== undefined) {
          const surrounding = expBlock.slice(Math.max(0, match.index - 50), Math.min(expBlock.length, match.index + 200));

          // Look for company
          let company = '';
          const atMatch = surrounding.match(/(?:at|@|,)\s+([A-Z][a-zA-Z0-9\s&.-]+)/i);
          if (atMatch) {
            company = atMatch[1].split(/\n|,/)[0].trim().slice(0, 50);
          }

          // Drop any parsed entry that has no real title AND company
          // Never emit placeholders such as "Organisation"
          if (!company || /^(organisation|organization|company|unknown|n\/a)$/i.test(company.trim())) {
            continue;
          }

          // Look for years
          const years = surrounding.match(/\b(19\d{2}|20\d{2})\b/g);
          let startYear: number | undefined;
          let endYear: number | undefined;
          if (years && years.length >= 1) {
            const parsed = years.map((y) => parseInt(y, 10)).filter((y) => y >= 1990 && y <= 2035 && y !== 1970);
            if (parsed.length >= 2) {
              startYear = Math.min(parsed[0], parsed[1]);
              endYear = Math.max(parsed[0], parsed[1]);
            } else if (parsed.length === 1) {
              startYear = parsed[0];
            }
          }

          const isCurrent = /present|current/i.test(surrounding);

          experiences.push({
            jobTitle: title,
            company,
            startDate: startYear ? `${startYear}-01` : undefined,
            endDate: isCurrent ? undefined : (endYear ? `${endYear}-12` : undefined),
            currentJob: isCurrent,
          });

          if (experiences.length >= 3) break;
        }
      }
    }

    return experiences;
  }

  /**
   * Extracts projects
   */
  private extractProjects(text: string): ParsedProject[] {
    const projects: ParsedProject[] = [];
    const projMatch = text.match(
      /(?:projects|academic projects|key projects)[:\s]*\n([\s\S]{30,800}?)(?:\n\s*\n|\b(?:education|skills|certifications|experience)\b)/i,
    );

    if (projMatch && projMatch[1]) {
      const lines = projMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (/^[•*-]\s*[A-Z]/.test(line) || /^[A-Z][a-zA-Z0-9\s_-]+(?::|-)/.test(line)) {
          const parts = line.replace(/^[•*-]\s*/, '').split(/[:\-–]/);
          const title = parts[0].trim();
          const desc = parts.slice(1).join(' ').trim();
          if (title.length >= 3 && title.length <= 60) {
            projects.push({
              title,
              description: desc || undefined,
            });
            if (projects.length >= 3) break;
          }
        }
      }
    }

    return projects;
  }

  /**
   * Extracts certifications
   */
  private extractCertifications(text: string): ParsedCertification[] {
    const certs: ParsedCertification[] = [];
    const certMatch = text.match(
      /(?:certifications|certificates|licenses)[:\s]*\n([\s\S]{20,500}?)(?:\n\s*\n|\b(?:education|skills|projects|experience)\b)/i,
    );

    if (certMatch && certMatch[1]) {
      const lines = certMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const clean = line.replace(/^[•*-]\s*/, '').trim();
        if (clean.length >= 4 && clean.length <= 80) {
          certs.push({ name: clean });
          if (certs.length >= 4) break;
        }
      }
    }

    return certs;
  }

  /**
   * Extracts spoken languages
   */
  private extractLanguages(text: string): string[] {
    const commonLanguages = [
      'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
      'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Spanish', 'French', 'German',
    ];
    const found: string[] = [];
    for (const lang of commonLanguages) {
      if (new RegExp(`\\b${lang}\\b`, 'i').test(text)) {
        found.push(lang);
      }
    }
    return found;
  }

  /**
   * Extracts LinkedIn, GitHub, portfolio links
   */
  private extractLinks(text: string): ParsedResumeData['links'] {
    const links: ParsedResumeData['links'] = {};

    const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    if (linkedinMatch) {
      links.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
    }

    const githubMatch = text.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
    if (githubMatch) {
      links.github = `https://github.com/${githubMatch[1]}`;
    }

    const portfolioMatch = text.match(/(?:https?:\/\/)?([a-zA-Z0-9-]+\.(?:dev|me|io|portfolio|site))/i);
    if (portfolioMatch && !portfolioMatch[0].includes('github') && !portfolioMatch[0].includes('linkedin')) {
      links.portfolio = portfolioMatch[0].startsWith('http') ? portfolioMatch[0] : `https://${portfolioMatch[0]}`;
    }

    return links;
  }

  /**
   * Merge rules:
   * 1. Parsed data fills ONLY empty profile fields (null, undefined, or empty array/string).
   * 2. It must NEVER overwrite anything the user typed.
   * 3. Returns the merged object along with a list of auto-filled field names
   *    so the UI can render the "From resume - review" badges.
   */
  mergeParsedData(
    currentProfile: any,
    parsed: ParsedResumeData,
  ): { merged: any; autoFilledFields: string[] } {
    const merged = { ...currentProfile };
    const autoFilledFields: string[] = [];

    const isEmpty = (val: any) =>
      val === null ||
      val === undefined ||
      (typeof val === 'string' && val.trim().length === 0) ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty(merged.headline) && parsed.headline) {
      merged.headline = parsed.headline;
      autoFilledFields.push('headline');
    }

    if (isEmpty(merged.location) && parsed.location) {
      merged.location = parsed.location;
      autoFilledFields.push('location');
    }

    if (isEmpty(merged.phone) && parsed.phone) {
      merged.phone = parsed.phone;
      autoFilledFields.push('phone');
    }

    if (isEmpty(merged.bio) && parsed.summary) {
      merged.bio = parsed.summary;
      autoFilledFields.push('bio');
    }

    if (isEmpty(merged.skills) && parsed.skills && parsed.skills.length > 0) {
      merged.skills = [...parsed.skills];
      autoFilledFields.push('skills');
    }

    if (isEmpty(merged.education) && parsed.education && parsed.education.length > 0) {
      merged.education = [...parsed.education];
      autoFilledFields.push('education');
    }

    if (isEmpty(merged.experience) && parsed.experience && parsed.experience.length > 0) {
      merged.experience = [...parsed.experience];
      autoFilledFields.push('experience');
    }

    if (isEmpty(merged.projects) && parsed.projects && parsed.projects.length > 0) {
      merged.projects = [...parsed.projects];
      autoFilledFields.push('projects');
    }

    if (isEmpty(merged.certifications) && parsed.certifications && parsed.certifications.length > 0) {
      merged.certifications = [...parsed.certifications];
      autoFilledFields.push('certifications');
    }

    if (isEmpty(merged.languages) && parsed.languages && parsed.languages.length > 0) {
      merged.languages = [...parsed.languages];
      autoFilledFields.push('languages');
    }

    // Merge socialLinks
    const currentSocial = merged.socialLinks || {};
    const newSocial = { ...currentSocial };
    let socialUpdated = false;

    if (isEmpty(currentSocial.linkedin) && parsed.links?.linkedin) {
      newSocial.linkedin = parsed.links.linkedin;
      socialUpdated = true;
    }
    if (isEmpty(currentSocial.github) && parsed.links?.github) {
      newSocial.github = parsed.links.github;
      socialUpdated = true;
    }
    if (isEmpty(currentSocial.portfolio) && parsed.links?.portfolio) {
      newSocial.portfolio = parsed.links.portfolio;
      socialUpdated = true;
    }

    if (socialUpdated) {
      merged.socialLinks = newSocial;
      autoFilledFields.push('socialLinks');
    }

    return { merged, autoFilledFields };
  }
}

/**
 * AI Resume Parser Adapter Placeholder
 * Follows IResumeParser. In production with OpenAI/Gemini configured, this would call LLM.
 * Currently delegates gracefully to RuleBasedResumeParser.
 */
@Injectable()
export class AiResumeParserAdapter implements IResumeParser {
  private readonly logger = new Logger(AiResumeParserAdapter.name);

  constructor(private readonly fallbackParser: ResumeParserService) {}

  async parse(text: string): Promise<ParsedResumeData> {
    this.logger.log('AiResumeParserAdapter: using robust rule-based parsing engine fallback');
    return this.fallbackParser.parse(text);
  }
}
