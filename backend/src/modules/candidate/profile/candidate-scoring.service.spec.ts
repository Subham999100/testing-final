import { CandidateScoringService } from './candidate-scoring.service';

describe('CandidateScoringService', () => {
  let service: CandidateScoringService;

  beforeEach(() => {
    service = new CandidateScoringService();
  });

  it('scores an empty candidate profile at 0', () => {
    const result = service.calculateScore({
      user: null,
      profile: {},
    });
    expect(result.score).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.nextMilestone).toBe(50);
  });

  it('scores a fully completed profile at exactly 100', () => {
    const result = service.calculateScore({
      user: {
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'aarav@example.com',
        isEmailVerified: true,
      },
      profile: {
        phone: '9876543210',
        location: 'Bengaluru',
        photoStorageKey: 'photos/aarav.jpg',
        headline: 'Senior Full Stack TypeScript & React Developer',
        bio: 'Passionate software engineer building high-scale cloud platforms with 6+ years experience.',
        education: [
          {
            degree: 'B.Tech Computer Science',
            institution: 'IIT Bombay',
            startYear: 2018,
            endYear: 2022,
          },
        ],
        experience: [
          {
            title: 'Senior Software Engineer',
            company: 'TechCorp India',
            startYear: 2022,
          },
        ],
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
        resumeStorageKey: 'resumes/aarav_resume.pdf',
        projects: [
          {
            title: 'Clyptus Job Platform',
            description: 'Scalable job portal with ATS and talent search',
          },
        ],
        certifications: [
          {
            name: 'AWS Certified Solutions Architect',
          },
        ],
        languages: [
          {
            name: 'English',
            proficiency: 'Fluent',
          },
        ],
        preferredLocations: ['Bengaluru', 'Remote'],
        preferredJobTypes: ['Full-time'],
        preferredWorkModes: ['Hybrid'],
        socialLinks: {
          linkedin: 'https://linkedin.com/in/aarav',
          github: 'https://github.com/aarav',
        },
        isFresher: false,
      },
    });

    expect(result.score).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.nextMilestone).toBeNull();
  });

  it('awards 15 points to a Fresher with projects even without work experience', () => {
    const result = service.calculateScore({
      user: {
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'priya@example.com',
        isEmailVerified: true,
      },
      profile: {
        isFresher: true,
        projects: [
          {
            title: 'E-commerce React Application',
            description: 'Built online store using Next.js and Stripe',
          },
        ],
        experience: [],
      },
    });

    expect(result.breakdown.experience.score).toBe(15);
    expect(result.breakdown.experience.complete).toBe(true);
  });

  it('denies education points if dates are inverted (endYear < startYear)', () => {
    const result = service.calculateScore({
      user: null,
      profile: {
        education: [
          {
            degree: 'B.Tech',
            institution: 'NIT Trichy',
            startYear: 2024,
            endYear: 2020, // Inverted!
          },
        ],
      },
    });

    expect(result.breakdown.education.score).toBe(0);
    expect(result.breakdown.education.complete).toBe(false);
  });

  it('allocates partial credit for skills (3 for 1-2, 6 for 3-4, 10 for 5+)', () => {
    const oneSkill = service.calculateScore({
      user: null,
      profile: { skills: ['React'] },
    });
    expect(oneSkill.breakdown.skills.score).toBe(3);

    const fourSkills = service.calculateScore({
      user: null,
      profile: { skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] },
    });
    expect(fourSkills.breakdown.skills.score).toBe(6);

    const fiveSkills = service.calculateScore({
      user: null,
      profile: { skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'] },
    });
    expect(fiveSkills.breakdown.skills.score).toBe(10);
  });

  it('requires verified email for full basic details score', () => {
    const unverified = service.calculateScore({
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isEmailVerified: false,
      },
      profile: {
        phone: '9876543210',
        location: 'Mumbai',
      },
    });
    expect(unverified.breakdown.basicDetails.score).toBe(11); // 4 (name) + 0 (unverified) + 4 (phone) + 3 (city)

    const verified = service.calculateScore({
      user: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isEmailVerified: true,
      },
      profile: {
        phone: '9876543210',
        location: 'Mumbai',
      },
    });
    expect(verified.breakdown.basicDetails.score).toBe(15);
  });

  it('rejects placeholder "University / College" and awards 0 education points', () => {
    const result = service.calculateScore({
      user: null,
      profile: {
        education: [
          {
            degree: 'B.Tech',
            institution: 'University / College',
            startYear: 2018,
            endYear: 2022,
          },
        ],
      },
    });
    expect(result.breakdown.education.score).toBe(0);
    expect(result.breakdown.education.complete).toBe(false);
  });

  it('rejects placeholder "Organisation" and awards 0 experience points for experienced candidate', () => {
    const result = service.calculateScore({
      user: null,
      profile: {
        isFresher: false,
        experience: [
          {
            title: 'Software Engineer',
            company: 'Organisation',
          },
        ],
      },
    });
    expect(result.breakdown.experience.score).toBe(0);
    expect(result.breakdown.experience.complete).toBe(false);
  });

  it('scores at most 70 (never ~94%) when education and experience are empty or contain only placeholders', () => {
    const result = service.calculateScore({
      user: {
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'aarav@example.com',
        isEmailVerified: true,
      },
      profile: {
        isFresher: false,
        phone: '9876543210',
        location: 'Bengaluru',
        photoStorageKey: 'photos/aarav.jpg',
        headline: 'Full Stack Developer',
        bio: 'Passionate developer with expertise in building scalable cloud web applications.',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        resumeStorageKey: 'resumes/aarav.pdf',
        projects: [{ title: 'Personal Portfolio' }],
        certifications: [{ name: 'AWS Certified' }],
        languages: ['English', 'Hindi'],
        preferredLocations: ['Bengaluru'],
        preferredJobTypes: ['Full-time'],
        socialLinks: { github: 'https://github.com/aarav' },
        // Education and Experience have placeholders or are empty
        education: [
          {
            degree: 'B.Tech',
            institution: 'University / College',
            startYear: 2018,
            endYear: 2022,
          },
        ],
        experience: [
          {
            jobTitle: 'Software Engineer',
            company: 'Organisation',
          },
        ],
      },
    });

    expect(result.breakdown.education.score).toBe(0);
    expect(result.breakdown.experience.score).toBe(0);
    // 100 - 15 (edu) - 15 (exp) = 70 max
    expect(result.score).toBeLessThanOrEqual(70);
  });
});

