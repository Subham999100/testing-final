// ============================================================
// CLYPTUS RECRUITMENT PLATFORM — DEMO SECOND ORGANISATION SEED
// Target: clyptus_unified_dev (DEMO ONLY)
// Creates a second organisation "Zenith Technologies" with
// 1 Organisation Admin, 1 Recruiter, and 4 PUBLISHED jobs
// with future application deadlines and varied attributes.
// Idempotent via upserts and job-count guard.
// ============================================================

import {
  BillingCycle,
  EmploymentType,
  JobStatus,
  OrganisationStatus,
  PrismaClient,
  UserRole,
  WorkMode,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROLE_DEFAULTS } from '../src/modules/org/common/org-permissions';

const prisma = new PrismaClient();

async function main() {
  const demoPassword = process.env.ORG_SEED_PASSWORD || 'Clyptus@2026'; // DEMO ONLY

  console.log('Seeding demo second organisation (Zenith Technologies)...');

  // 1. Create or upsert second organisation: Zenith Technologies
  const org = await prisma.organisation.upsert({
    where: { slug: 'zenith-tech' },
    update: {},
    create: {
      name: 'Zenith Technologies',
      slug: 'zenith-tech',
      domain: 'zenithtech.io',
      contactEmail: 'talent@zenithtech.io',
      contactPhone: '+91-80-45678900',
      status: OrganisationStatus.ACTIVE,
      tier: 'GROWTH',
      recruiterLimit: 15,
      metadata: {
        create: {
          industry: 'Cloud & DevOps Software',
          companySize: '250-500',
          website: 'https://zenithtech.io',
        },
      },
      tokenBalance: {
        create: {
          balance: 6000,
          allocatedTokens: 8000,
          consumedTokens: 2000,
          reservedTokens: 0,
        },
      },
      allocationLimit: {
        create: {
          monthlyMaxAllocation: 20000,
          singleTxLimit: 8000,
        },
      },
    },
  });

  await prisma.orgSettings.upsert({
    where: { organisationId: org.id },
    create: { organisationId: org.id },
    update: {},
  });

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  // 2. Create Zenith Organisation Admin & Recruiter
  const people = [
    {
      email: 'admin@zenithtech.io',
      firstName: 'Zoya',
      lastName: 'Akhtar',
      role: UserRole.ORGANISATION_ADMIN,
      title: 'Director of People Operations',
    },
    {
      email: 'recruiter@zenithtech.io',
      firstName: 'Rohan',
      lastName: 'Deshmukh',
      role: UserRole.RECRUITER,
      title: 'Lead Technical Recruiter',
    },
  ];

  const users: Record<string, string> = {};

  for (const p of people) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        organisationId: org.id,
        isActive: true,
        isEmailVerified: true,
      },
    });

    await prisma.orgMemberProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        organisationId: org.id,
        title: p.title,
        timezone: 'Asia/Kolkata',
        permissions: ROLE_DEFAULTS[p.role as keyof typeof ROLE_DEFAULTS],
      },
    });

    users[p.email] = user.id;
  }

  const adminId = users['admin@zenithtech.io'];
  const recruiterId = users['recruiter@zenithtech.io'];

  // Idempotency check: if jobs already exist for Zenith Technologies, do not duplicate
  if ((await prisma.job.count({ where: { organisationId: org.id } })) > 0) {
    console.log('Zenith Technologies jobs already seeded. Users ensured, exiting cleanly.');
    return;
  }

  // Allocate tokens to recruiter
  await prisma.tokenAllocation.create({
    data: { organisationId: org.id, userId: recruiterId, allocated: 500 },
  });
  await prisma.memberTokenEntry.create({
    data: {
      organisationId: org.id,
      userId: recruiterId,
      actorId: adminId,
      type: 'ALLOCATE',
      amount: 500,
      reason: 'Initial demo allocation (seed)',
    },
  });

  const now = Date.now();
  const dayMs = 86_400_000;

  // 3. Create 4 PUBLISHED jobs with future deadlines and varied attributes
  const demoJobs = [
    {
      title: 'Senior Cloud Infrastructure Engineer',
      description:
        'Architect and scale multi-region Kubernetes clusters and Infrastructure as Code for high-throughput enterprise APIs.',
      responsibilities:
        'Manage EKS and GKE clusters.\nDrive Terraform module standards.\nLead incident post-mortems and automate recovery workflows.',
      requiredSkills: ['AWS', 'Kubernetes', 'Terraform', 'Go'],
      preferredSkills: ['Istio', 'Prometheus', 'ArgoCD'],
      experienceMin: 5,
      experienceMax: 10,
      salaryMin: 3200000,
      salaryMax: 4800000,
      currency: 'INR',
      location: 'Remote - India',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      department: 'Platform Engineering',
      openings: 3,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - 5 * dayMs),
      deadline: new Date(now + 35 * dayMs), // 35 days in future
      createdById: recruiterId,
    },
    {
      title: 'Full Stack AI Engineer',
      description:
        'Build user-facing interfaces and backend orchestration pipelines integrating frontier LLMs and document intelligence workflows.',
      responsibilities:
        'Develop responsive web interfaces with React and Tailwind.\nImplement asynchronous agent pipelines with Python FastAPI.\nEvaluate retrieval accuracy and model latency.',
      requiredSkills: ['Python', 'React', 'FastAPI', 'PyTorch', 'TypeScript'],
      preferredSkills: ['Next.js', 'PostgreSQL', 'LangChain'],
      experienceMin: 3,
      experienceMax: 7,
      salaryMin: 2200000,
      salaryMax: 3600000,
      currency: 'INR',
      location: 'Hyderabad',
      workMode: WorkMode.HYBRID,
      employmentType: EmploymentType.FULL_TIME,
      department: 'AI Products',
      openings: 2,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - 3 * dayMs),
      deadline: new Date(now + 42 * dayMs), // 42 days in future
      createdById: recruiterId,
    },
    {
      title: 'Product Security Specialist',
      description:
        'Partner with core engineering to harden application security boundaries, review architectures, and perform penetration assessments.',
      responsibilities:
        'Conduct threat modeling on cloud APIs.\nImplement SAST/DAST tooling into CI/CD pipelines.\nDrive remediation of vulnerability disclosures.',
      requiredSkills: ['Application Security', 'OWASP', 'Penetration Testing', 'CI/CD'],
      preferredSkills: ['Burp Suite', 'OAuth2', 'Docker'],
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 2800000,
      salaryMax: 4200000,
      currency: 'INR',
      location: 'Bengaluru',
      workMode: WorkMode.ONSITE,
      employmentType: EmploymentType.FULL_TIME,
      department: 'Information Security',
      openings: 1,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - 8 * dayMs),
      deadline: new Date(now + 50 * dayMs), // 50 days in future
      createdById: recruiterId,
    },
    {
      title: 'DevOps Engineering Intern',
      description:
        'Join our core systems team to learn container orchestration, CI/CD pipeline automation, and system observability.',
      responsibilities:
        'Build and maintain container build pipelines.\nAssist in developing monitoring dashboards.\nDocument developer setup workflows.',
      requiredSkills: ['Linux', 'Docker', 'Bash', 'Git'],
      preferredSkills: ['Python', 'GitHub Actions', 'AWS'],
      experienceMin: 0,
      experienceMax: 1,
      salaryMin: 400000,
      salaryMax: 600000,
      currency: 'INR',
      location: 'Remote - India',
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.INTERNSHIP,
      department: 'Platform Engineering',
      openings: 2,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(now - 1 * dayMs),
      deadline: new Date(now + 25 * dayMs), // 25 days in future
      createdById: recruiterId,
    },
  ];

  for (const jobData of demoJobs) {
    await prisma.job.create({
      data: {
        organisationId: org.id,
        ...jobData,
        assignments: {
          create: [{ organisationId: org.id, userId: recruiterId }],
        },
      },
    });
  }

  console.log('Seeded Zenith Technologies demo organisation and 4 published jobs.');
}

main()
  .catch((e) => {
    console.error('Error seeding second organisation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
