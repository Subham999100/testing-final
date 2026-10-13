import { ResumeParserService } from './resume-parser.service';

describe('ResumeParserService', () => {
  let parser: ResumeParserService;

  beforeEach(() => {
    parser = new ResumeParserService();
  });

  it('should strip section prefixes from skills and split compound skills', () => {
    const text = `
      Technical Skills:
      Frameworks TensorFlow
      Libraries PyTorch
      React / Redux
      Node.js & Express
      Languages: Python, Java
    `;

    const skills = parser.extractSkills(text);

    // Verify "Frameworks TensorFlow" was stripped to "TensorFlow"
    expect(skills).toContain('TensorFlow');
    expect(skills).not.toContain('Frameworks TensorFlow');

    // Verify "Libraries PyTorch" was stripped to "PyTorch"
    expect(skills).toContain('PyTorch');

    // Verify compound skills were split
    expect(skills).toContain('React');
    expect(skills).toContain('Redux');
    expect(skills).toContain('Node.js');
    expect(skills).toContain('Express');
    expect(skills).toContain('Python');
    expect(skills).toContain('Java');
  });

  it('should strip composite headings and prefixes like "Programming: Python", "Tools & Platforms: Git", "Core Concepts: Statistical Modeling"', () => {
    const text = `
      Technical Skills:
      Programming: Python
      Tools & Platforms: Git
      Core Concepts: Statistical Modeling
      Frameworks TensorFlow
    `;

    const skills = parser.extractSkills(text);
    expect(skills).toContain('Python');
    expect(skills).toContain('Git');
    expect(skills).toContain('TensorFlow');
    expect(skills).not.toContain('Programming: Python');
    expect(skills).not.toContain('Programming Python');
    expect(skills).not.toContain('Tools & Platforms: Git');
    expect(skills).not.toContain('Core Concepts: Statistical Modeling');
  });

  it('should dedupe skills case-insensitively', () => {
    const text = `
      Skills:
      python, Python, PYTHON, react, React
    `;

    const skills = parser.extractSkills(text);
    const pythonCount = skills.filter((s) => s.toLowerCase() === 'python').length;
    const reactCount = skills.filter((s) => s.toLowerCase() === 'react').length;

    expect(pythonCount).toBe(1);
    expect(reactCount).toBe(1);
  });

  it('should map education into structured fields and never dump raw text into description', () => {
    const text = `
      Education:
      Bachelor of Technology in Computer Science
      National Institute of Technology Karnataka (NIT)
      2018 - 2022
      CGPA: 8.9
    `;

    const education = parser.extractEducation(text);

    expect(education.length).toBeGreaterThan(0);
    const entry = education[0];

    expect(entry.degree).toBe('B.Tech');
    expect(entry.fieldOfStudy).toBe('Computer Science');
    expect(entry.institution).toContain('National Institute of Technology');
    expect(entry.startYear).toBe(2018);
    expect(entry.endYear).toBe(2022);
    expect(entry.grade).toContain('8.9');

    // Confirm there is NO raw text dump field
    expect((entry as any).description).toBeUndefined();
  });

  it('should ignore placeholder years like 1970 or 0000', () => {
    const text = `
      Education:
      B.Tech Computer Science
      Delhi Technological University
      1970 - 2021
    `;

    const education = parser.extractEducation(text);
    expect(education.length).toBeGreaterThan(0);
    const entry = education[0];

    // 1970 must not be treated as a valid start year
    expect(entry.startYear).not.toBe(1970);
    expect(entry.endYear).toBe(2021);
  });

  it('should parse full sample resume into structured resume data', async () => {
    const resumeText = `
      Aman Verma
      aman.verma@example.com
      +91 9876543210
      Bengaluru, India
      linkedin.com/in/amanverma
      github.com/amanverma

      Professional Summary:
      Experienced full stack engineer with expertise in building scalable cloud web applications.

      Technical Skills:
      Frameworks React
      Libraries Redux
      TypeScript, Node.js, Express, PostgreSQL, Docker, AWS

      Education:
      B.Tech Computer Science
      Indian Institute of Technology Madras
      2017 - 2021
      CGPA: 8.5

      Experience:
      Software Engineer at Acme Corp
      2021 - Present
      Developed microservices and REST APIs using NestJS and PostgreSQL.
    `;

    const parsed = await parser.parse(resumeText);

    expect(parsed.email).toBe('aman.verma@example.com');
    expect(parsed.phone).toBe('9876543210');
    expect(parsed.location).toBe('Bengaluru');
    expect(parsed.skills).toContain('React');
    expect(parsed.skills).toContain('TypeScript');
    expect(parsed.skills).toContain('PostgreSQL');
    expect(parsed.education.length).toBeGreaterThan(0);
    expect(parsed.education[0].degree).toBe('B.Tech');
    expect(parsed.education[0].institution).toContain('Indian Institute of Technology Madras');
    expect(parsed.links.linkedin).toBe('https://linkedin.com/in/amanverma');
    expect(parsed.links.github).toBe('https://github.com/amanverma');
  });

  describe('mergeParsedData (Merge Rules)', () => {
    it('should fill empty fields from parsed data without overwriting existing user input', () => {
      const currentProfile = {
        headline: 'User Defined Headline', // Already filled by candidate
        location: null,                    // Empty
        phone: '',                         // Empty
        skills: ['TypeScript', 'Node.js'], // Already filled
        education: [],                     // Empty
        experience: [],                    // Empty
        socialLinks: {
          github: 'https://github.com/myuser', // Already filled
        },
      };

      const parsedData = {
        headline: 'Parsed Headline From Resume',
        location: 'Bengaluru',
        phone: '9876543210',
        skills: ['Python', 'Django', 'React'],
        education: [
          {
            degree: 'B.Tech',
            institution: 'IIT Madras',
            fieldOfStudy: 'Computer Science',
            startYear: 2018,
            endYear: 2022,
          },
        ],
        experience: [
          {
            jobTitle: 'Software Engineer',
            company: 'Tech Corp',
          },
        ],
        projects: [],
        certifications: [],
        languages: ['English', 'Hindi'],
        links: {
          github: 'https://github.com/otheruser',
          linkedin: 'https://linkedin.com/in/myuser',
        },
      };

      const result = parser.mergeParsedData(currentProfile, parsedData);

      // Existing user inputs MUST NEVER be overwritten
      expect(result.merged.headline).toBe('User Defined Headline');
      expect(result.merged.skills).toEqual(['TypeScript', 'Node.js']);
      expect(result.merged.socialLinks.github).toBe('https://github.com/myuser');

      // Empty fields MUST be filled
      expect(result.merged.location).toBe('Bengaluru');
      expect(result.merged.phone).toBe('9876543210');
      expect(result.merged.education.length).toBe(1);
      expect(result.merged.education[0].degree).toBe('B.Tech');
      expect(result.merged.experience.length).toBe(1);
      expect(result.merged.languages).toEqual(['English', 'Hindi']);
      expect(result.merged.socialLinks.linkedin).toBe('https://linkedin.com/in/myuser');

      // Auto-filled field list must accurately reflect only fields that were changed
      expect(result.autoFilledFields).toContain('location');
      expect(result.autoFilledFields).toContain('phone');
      expect(result.autoFilledFields).toContain('education');
      expect(result.autoFilledFields).toContain('experience');
      expect(result.autoFilledFields).toContain('languages');
      expect(result.autoFilledFields).toContain('socialLinks');
      expect(result.autoFilledFields).not.toContain('headline');
      expect(result.autoFilledFields).not.toContain('skills');
    });
  });
});

