export const searchFields = [
  "workAuthorisation",
  "activityDays",
  "sourceGroup",
  "booleanMode",
  "excludeSynonyms",
  "preferredLocation",
  "excludeCompany",
  "companyScope",
  "designationScope",
  "industryScope",
  "ug",
  "pg",
  "phd",
  "ugText",
  "pgText",
  "phdText",
  "ugCourse",
  "ugInstitute",
  "ugYearFrom",
  "ugYearTo",
  "pgCourse",
  "pgInstitute",
  "pgYearFrom",
  "pgYearTo",
  "phdCourse",
  "phdInstitute",
  "phdYearFrom",
  "phdYearTo",
  "servingNotice",
  "hasResume",
  "hideEmailed",
  "hideUnlocked",
  "language",
  "languages",
  "minAge",
  "maxAge",
  "includeUnknownAge",
  "workMode",
  "employmentType",
  "source",
  "insights",

  "search",
  "exclude",
  "searchIn",
  "location",
  "company",
  "designation",
  "education",
  "industry",
  "minExperience",
  "maxExperience",
  "minExperienceMonths",
  "maxExperienceMonths",
  "minSalary",
  "maxSalary",
  "noticeDays",
  "activeDays",
  "updatedDays",
  "includePreferred",
  "includeUnknownSalary",
  "includeUnknownNotice",
  "saved",
  "hideViewed",
  "folderId",
  "sort",
  "page",
  "limit",
];
const numeric = new Set([
  "activityDays",
  "minExperience",
  "maxExperience",
  "minExperienceMonths",
  "maxExperienceMonths",
  "minSalary",
  "maxSalary",
  "noticeDays",
  "activeDays",
  "updatedDays",
  "ugYearFrom",
  "ugYearTo",
  "pgYearFrom",
  "pgYearTo",
  "phdYearFrom",
  "phdYearTo",
  "minAge",
  "maxAge",
  "page",
  "limit",
]);

export const UG_COURSES = [
  "B.Tech/B.E.",
  "B.Sc",
  "BCA",
  "B.Com",
  "BBA/BBM",
  "B.A.",
  "MBBS",
  "B.Pharm",
  "B.Arch",
  "B.Des",
  "Other Graduation",
];

export const PG_COURSES = [
  "M.Tech/M.E.",
  "MCA",
  "MBA/PGDM",
  "M.Sc",
  "M.Com",
  "M.A.",
  "MS",
  "MD",
  "M.Pharm",
  "Other Post Graduation",
];

export const PHD_COURSES = [
  "Ph.D. / Doctorate",
  "Ph.D. in Engineering",
  "Ph.D. in Computer Science",
  "Ph.D. in Science",
  "Ph.D. in Management",
  "Other Doctorate",
];

export const PASSING_YEARS = Array.from(
  { length: 55 },
  (_, i) => new Date().getFullYear() + 4 - i,
);

export const AGE_OPTIONS = Array.from({ length: 48 }, (_, i) => 18 + i);

export const POPULAR_LANGUAGES = [
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Bengali",
  "Bodo",
  "Bulgarian",
  "Czech",
  "Danish",
  "Dogri",
  "Dutch",
  "English",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Gujarati",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Indonesian",
  "Italian",
  "Japanese",
  "Kannada",
  "Kashmiri",
  "Konkani",
  "Korean",
  "Maithili",
  "Malay",
  "Malayalam",
  "Mandarin",
  "Manipuri",
  "Marathi",
  "Nepali",
  "Norwegian",
  "Odia",
  "Persian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Sanskrit",
  "Santali",
  "Sindhi",
  "Spanish",
  "Swedish",
  "Tamil",
  "Telugu",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
];
export function cleanSearch(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([k, v]) => searchFields.includes(k) && v !== "" && v != null)
      .map(([k, v]) => [k, String(v)]),
  );
}
export function searchBody(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(cleanSearch(values)).map(([k, v]) => [
      k,
      numeric.has(k) ? Number(v) : v,
    ]),
  );
}
export function searchUrl(values: Record<string, unknown>) {
  return `/org/candidates?${new URLSearchParams({ ...cleanSearch(values), results: "1", run: crypto.randomUUID(), page: "1" })}`;
}
export function searchLabel(values: Record<string, unknown>) {
  const v = cleanSearch(values);
  return [
    v.search || "All candidates",
    v.location,
    v.minExperience ? `${v.minExperience}y+` : null,
    v.maxExperience ? `up to ${v.maxExperience}y` : null,
    v.noticeDays === "0"
      ? "Immediate joiner"
      : v.noticeDays
        ? `Notice ≤ ${v.noticeDays} days`
        : null,
    v.company,
    v.education,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function skillsFromDescription(description: string) {
  const terms = [
    "JavaScript",
    "TypeScript",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Python",
    "Java",
    "Spring Boot",
    "AWS",
    "Azure",
    "GCP",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "Machine Learning",
    "TensorFlow",
    "PyTorch",
    "Salesforce",
    "Excel",
    "Figma",
    "Power BI",
    "Tableau",
    "C++",
    "C#",
    ".NET",
    "Go",
    "Rust",
    "PHP",
    "Ruby",
    "Flutter",
    "Swift",
    "Kotlin",
  ];
  return terms.filter((term) =>
    new RegExp(
      "(^|[^a-z0-9])" +
        term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?=$|[^a-z0-9])",
      "i",
    ).test(description),
  );
}

export interface ExtractedQueryCriteria {
  search: string;
  skills: string[];
  location?: string;
  minExperience?: string;
  maxExperience?: string;
  minSalary?: string;
  maxSalary?: string;
  noticeDays?: string;
  workMode?: string;
  explanation: string;
}

export function interpretNaturalQuery(text: string): ExtractedQueryCriteria {
  const clean = text.trim();
  if (!clean) {
    return {
      search: "",
      skills: [],
      explanation: "No input provided.",
    };
  }

  const skills = skillsFromDescription(clean);
  const detected: string[] = [];

  let minExp: string | undefined;
  let maxExp: string | undefined;
  const expRangeMatch = clean.match(/(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*(?:years?|yrs?)/i);
  if (expRangeMatch) {
    minExp = expRangeMatch[1];
    maxExp = expRangeMatch[2];
    detected.push(`Experience: ${minExp} to ${maxExp} years`);
  } else {
    const minExpMatch = clean.match(/(?:over|more than|at least|min|minimum|\+)?\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);
    if (minExpMatch) {
      minExp = minExpMatch[1];
      detected.push(`Experience: ${minExp}+ years`);
    } else if (/\bfresher(?:s)?\b/i.test(clean)) {
      minExp = "0";
      maxExp = "0";
      detected.push("Fresher");
    }
  }

  let location: string | undefined;
  const cities = [
    "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Mumbai", "Delhi",
    "Gurugram", "Gurgaon", "Noida", "Chennai", "Kolkata", "Ahmedabad",
    "Surat", "Jaipur", "Indore", "Chandigarh", "Kochi"
  ];
  for (const city of cities) {
    const cityRegex = new RegExp(`(?:\\b(?:in|from|at|near|location)\\s+)?\\b${city}\\b`, "i");
    if (cityRegex.test(clean)) {
      location = city.toLowerCase() === "bangalore" ? "Bengaluru" : city.toLowerCase() === "gurgaon" ? "Gurugram" : city;
      detected.push(`Location: ${location}`);
      break;
    }
  }

  let noticeDays: string | undefined;
  if (/immediate\s*(?:joiner)?/i.test(clean)) {
    noticeDays = "0";
    detected.push("Notice: Immediate joiner");
  } else {
    const noticeMatch = clean.match(/(?:within|upto|up to|notice\s*(?:period|of)?)\s*(?:is|of|under|<=)?\s*(\d{1,3})\s*days?/i);
    if (noticeMatch) {
      noticeDays = noticeMatch[1];
      detected.push(`Notice: ≤ ${noticeDays} days`);
    }
  }

  let minSal: string | undefined;
  let maxSal: string | undefined;
  const salRangeMatch = clean.match(/(\d{1,3})\s*(?:to|-)\s*(\d{1,3})\s*(?:lakhs?|lacs?|lpa)/i);
  if (salRangeMatch) {
    minSal = String(Number(salRangeMatch[1]) * 100000);
    maxSal = String(Number(salRangeMatch[2]) * 100000);
    detected.push(`Salary: ${salRangeMatch[1]} - ${salRangeMatch[2]} Lacs`);
  } else {
    const singleSalMatch = clean.match(/(\d{1,3})\s*(?:lakhs?|lacs?|lpa)/i);
    if (singleSalMatch) {
      minSal = String(Number(singleSalMatch[1]) * 100000);
      detected.push(`Salary: from ${singleSalMatch[1]} Lacs`);
    }
  }

  let workMode: string | undefined;
  if (/\bremote\b/i.test(clean)) {
    workMode = "REMOTE";
    detected.push("Work mode: Remote");
  } else if (/\bhybrid\b/i.test(clean)) {
    workMode = "HYBRID";
    detected.push("Work mode: Hybrid");
  } else if (/\b(?:on-?site|in-?office)\b/i.test(clean)) {
    workMode = "ONSITE";
    detected.push("Work mode: On-site");
  }

  let booleanQuery = "";
  if (skills.length > 0) {
    booleanQuery = skills.map((s) => (s.includes(" ") ? `"${s}"` : s)).join(" AND ");
  } else {
    const words = clean.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^(the|and|for|with|from|years?|yrs?|lakhs?|lpa|experience|candidates?|looking|need|want|find|show)$/i.test(w));
    if (words.length > 0) {
      booleanQuery = words.slice(0, 4).join(" AND ");
    }
  }

  if (skills.length > 0) {
    detected.unshift(`Skills: ${skills.join(", ")}`);
  }

  const explanation = detected.length > 0
    ? `Extracted criteria: ${detected.join("; ")}. Review and adjust before searching.`
    : "No recognized skills, experience, location, or salary terms found in query.";

  return {
    search: booleanQuery,
    skills,
    location,
    minExperience: minExp,
    maxExperience: maxExp,
    minSalary: minSal,
    maxSalary: maxSal,
    noticeDays,
    workMode,
    explanation,
  };
}
