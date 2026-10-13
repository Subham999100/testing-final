// ============================================================
// Clyptus Job Portal - Candidate Portal
// Constants, Indian Autocomplete Datasets, Taxonomies & Verbalizers
// ============================================================

export const INDIAN_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Gurugram',
  'Noida',
  'Kolkata',
  'Ahmedabad',
  'Chandigarh',
  'Jaipur',
  'Kochi',
  'Indore',
  'Coimbatore',
  'Lucknow',
  'Bhopal',
  'Nagpur',
  'Thiruvananthapuram',
  'Visakhapatnam',
  'Bhubaneswar',
  'Vadodara',
  'Surat',
];

export const QUALIFICATION_OPTIONS = [
  '10th',
  '12th',
  'Diploma',
  'Graduate',
  'Post-graduate',
  'Doctorate',
] as const;

export const POPULAR_DEGREES: Record<string, string[]> = {
  Graduate: [
    'Bachelor of Technology (B.Tech)',
    'Bachelor of Engineering (B.E.)',
    'Bachelor of Computer Applications (BCA)',
    'Bachelor of Science (B.Sc)',
    'Bachelor of Commerce (B.Com)',
    'Bachelor of Business Administration (BBA)',
    'Bachelor of Arts (B.A.)',
    'Bachelor of Design (B.Des)',
  ],
  'Post-graduate': [
    'Master of Technology (M.Tech)',
    'Master of Computer Applications (MCA)',
    'Master of Business Administration (MBA)',
    'Master of Science (M.Sc)',
    'Master of Commerce (M.Com)',
    'Master of Engineering (M.E.)',
  ],
  Diploma: [
    'Diploma in Computer Engineering',
    'Diploma in Mechanical Engineering',
    'Diploma in Electrical Engineering',
    'Diploma in Information Technology',
  ],
  '12th': ['Senior Secondary (Science)', 'Senior Secondary (Commerce)', 'Senior Secondary (Arts)'],
  '10th': ['Secondary School Certificate (SSC / 10th Standard)'],
  Doctorate: ['Doctor of Philosophy (Ph.D.)'],
};

export const POPULAR_INSTITUTIONS = [
  'Indian Institute of Technology (IIT) Madras',
  'Indian Institute of Technology (IIT) Delhi',
  'Indian Institute of Technology (IIT) Bombay',
  'Indian Institute of Technology (IIT) Kharagpur',
  'Indian Institute of Technology (IIT) Roorkee',
  'Birla Institute of Technology and Science (BITS) Pilani',
  'National Institute of Technology (NIT) Tiruchirappalli',
  'National Institute of Technology (NIT) Karnataka, Surathkal',
  'Vellore Institute of Technology (VIT)',
  'Delhi Technological University (DTU)',
  'Netaji Subhas University of Technology (NSUT)',
  'International Institute of Information Technology (IIIT) Hyderabad',
  'International Institute of Information Technology (IIIT) Bangalore',
  'Manipal Institute of Technology (MIT)',
  'Anna University, Chennai',
  'University of Delhi',
  'Jadavpur University',
  'PSG College of Technology',
  'Thapar Institute of Engineering and Technology',
];

export const SKILLS_TAXONOMY = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Next.js',
  'Python',
  'Java',
  'C++',
  'Go',
  'Rust',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'Git',
  'REST API',
  'GraphQL',
  'Tailwind CSS',
  'HTML5',
  'CSS3',
  'System Design',
  'Microservices',
  'Linux',
  'CI/CD',
  'Prisma',
  'NestJS',
  'Django',
  'Spring Boot',
  'Machine Learning',
  'Deep Learning',
  'Data Structures & Algorithms',
  'Jest',
  'Playwright',
  'Figma',
  'Agile / Scrum',
];

export const NOTICE_PERIODS = [
  'Immediate (0 days)',
  '15 Days',
  '30 Days (1 Month)',
  '60 Days (2 Months)',
  '90 Days (3 Months)',
  'Serving Notice Period',
];

export const JOB_TYPES = ['Full-time', 'Internship', 'Contract'];
export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];

/**
 * Converts Indian INR numeric salary to words (e.g. 700000 -> "Seven Lakh Rupees")
 */
export function inrToWords(amount: number | null | undefined): string {
  if (!amount || isNaN(amount) || amount <= 0) return '';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWordsLessThanThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  let num = Math.round(amount);
  const parts: string[] = [];

  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    parts.push(`${numToWordsLessThanThousand(crores)} Crore`);
    num %= 10000000;
  }

  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    parts.push(`${numToWordsLessThanThousand(lakhs)} Lakh`);
    num %= 100000;
  }

  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    parts.push(`${numToWordsLessThanThousand(thousands)} Thousand`);
    num %= 1000;
  }

  if (num > 0) {
    parts.push(numToWordsLessThanThousand(num));
  }

  return parts.length > 0 ? `${parts.join(' ')} Rupees per year` : '';
}
