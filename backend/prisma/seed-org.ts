// ============================================================
// ORGANISATION PORTAL — development seed (run after prisma/seed.ts)
//   npm run seed:org
// Creates one user per org role in the sample "acme-corp" organisation
// plus a few jobs, candidates and applications. Idempotent: existing
// users keep their passwords; demo data is only created once.
// Refuses to run in production.
// ============================================================

import { ApplicationStage, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ROLE_DEFAULTS } from '../src/modules/org/common/org-permissions';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('seed-org is for development only');
  const password = process.env.ORG_SEED_PASSWORD || 'Clyptus@2026';
  const org = await prisma.organisation.findUnique({ where: { slug: 'acme-corp' } });
  if (!org) throw new Error('Run the platform seed first (npx prisma db seed) — acme-corp not found');

  await prisma.orgSettings.upsert({ where: { organisationId: org.id }, create: { organisationId: org.id }, update: {} });
  const passwordHash = await bcrypt.hash(password, 12);

  const people = [
    { email: 'owner@acme.com', firstName: 'Olivia', lastName: 'Owner', role: UserRole.ORGANISATION_SUPER_ADMIN, title: 'Head of Talent' },
    { email: 'admin@acme.com', firstName: 'Aman', lastName: 'Admin', role: UserRole.ORGANISATION_ADMIN, title: 'Recruitment Ops Lead' },
    { email: 'priya@acme.com', firstName: 'Priya', lastName: 'Sharma', role: UserRole.RECRUITER, title: 'Tech Recruiter' },
    { email: 'arjun@acme.com', firstName: 'Arjun', lastName: 'Mehta', role: UserRole.RECRUITER, title: 'Hiring Manager' },
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
  const owner = users['owner@acme.com'];
  const admin = users['admin@acme.com'];
  const priya = users['priya@acme.com'];
  const arjun = users['arjun@acme.com'];

  if ((await prisma.job.count({ where: { organisationId: org.id } })) > 0) {
    console.log('Demo org data already present — users ensured, nothing else changed.');
    return;
  }

  // Token allocations (the wallet itself is seeded by prisma/seed.ts).
  for (const [userId, amount, actor] of [
    [admin, 1000, owner],
    [priya, 300, owner],
    [arjun, 300, owner],
  ] as const) {
    await prisma.tokenAllocation.create({ data: { organisationId: org.id, userId, allocated: amount } });
    await prisma.memberTokenEntry.create({ data: { organisationId: org.id, userId, actorId: actor, type: 'ALLOCATE', amount, reason: 'Initial allocation (seed)' } });
  }

  const now = Date.now();
  const react = await prisma.job.create({
    data: {
      organisationId: org.id,
      title: 'Senior React Developer',
      description: 'Build delightful, fast interfaces for our hiring platform. You will own features end-to-end with a small product team.',
      responsibilities: 'Ship features, review code, mentor juniors, improve performance.',
      requiredSkills: ['React', 'TypeScript'],
      preferredSkills: ['GraphQL', 'Tailwind'],
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 2500000,
      salaryMax: 4000000,
      location: 'Bengaluru',
      workMode: 'HYBRID',
      department: 'Engineering',
      openings: 2,
      status: 'PUBLISHED',
      publishedAt: new Date(now - 10 * 86_400_000),
      createdById: priya,
      assignments: { create: [{ organisationId: org.id, userId: priya }] },
    },
  });
  const sales = await prisma.job.create({
    data: {
      organisationId: org.id,
      title: 'Enterprise Sales Executive',
      description: 'Grow our enterprise customer base across India.',
      requiredSkills: ['Sales', 'Salesforce'],
      experienceMin: 3,
      location: 'Mumbai',
      workMode: 'ONSITE',
      department: 'Sales',
      status: 'PUBLISHED',
      publishedAt: new Date(now - 20 * 86_400_000),
      createdById: arjun,
      assignments: { create: [{ organisationId: org.id, userId: arjun }] },
    },
  });
  await prisma.job.create({
    data: {
      organisationId: org.id,
      title: 'Data Analyst',
      description: 'Turn hiring data into insights for our customers.',
      requiredSkills: ['SQL', 'Power BI'],
      location: 'Remote',
      workMode: 'REMOTE',
      department: 'Analytics',
      status: 'DRAFT',
      createdById: priya,
    },
  });

  const candidates = [
    { firstName: 'Neha', lastName: 'Kapoor', headline: 'React Developer', skills: ['react', 'typescript', 'graphql'], experienceYears: 5, location: 'Bengaluru', job: react.id, stage: 'INTERVIEW' },
    { firstName: 'Rahul', lastName: 'Verma', headline: 'Frontend Engineer', skills: ['react', 'javascript', 'css'], experienceYears: 3, location: 'Pune', job: react.id, stage: 'SCREENING' },
    { firstName: 'Sara', lastName: 'Khan', headline: 'Full-stack Developer', skills: ['react', 'node.js', 'typescript'], experienceYears: 6, location: 'Bengaluru', job: react.id, stage: 'SHORTLISTED' },
    { firstName: 'Vikram', lastName: 'Rao', headline: 'UI Developer', skills: ['html', 'css', 'vue'], experienceYears: 2, location: 'Chennai', job: react.id, stage: 'APPLIED' },
    { firstName: 'Ananya', lastName: 'Iyer', headline: 'Enterprise Sales Manager', skills: ['sales', 'salesforce', 'negotiation'], experienceYears: 7, location: 'Mumbai', job: sales.id, stage: 'OFFER' },
    { firstName: 'Karan', lastName: 'Singh', headline: 'Account Executive', skills: ['sales', 'crm'], experienceYears: 2, location: 'Delhi', job: sales.id, stage: 'REJECTED' },
  ];
  const order: ApplicationStage[] = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER'];
  for (const c of candidates) {
    const creator = c.job === react.id ? priya : arjun;
    const candidate = await prisma.candidate.create({
      data: {
        organisationId: org.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: `${c.firstName.toLowerCase()}.${c.lastName.toLowerCase()}@example.com`,
        phone: '+91 90000 00000',
        headline: c.headline,
        location: c.location,
        experienceYears: c.experienceYears,
        skills: c.skills,
        resumeText: `${c.firstName} ${c.lastName} — ${c.headline}. ${c.experienceYears} years experience with ${c.skills.join(', ')}.`,
        source: 'Referral',
        createdById: creator,
      },
    });
    const stage = c.stage as ApplicationStage;
    const app = await prisma.application.create({
      data: {
        organisationId: org.id,
        jobId: c.job,
        candidateId: candidate.id,
        stage,
        assignedToId: creator,
        rejectReason: stage === 'REJECTED' ? 'Experience below requirement' : null,
        createdById: creator,
        source: 'RECRUITER_ADDED',
      },
    });
    const path = stage === 'REJECTED' ? (['APPLIED', 'REJECTED'] as ApplicationStage[]) : order.slice(0, order.indexOf(stage) + 1);
    let prev: ApplicationStage | null = null;
    for (const s of path) {
      await prisma.applicationStageHistory.create({
        data: { organisationId: org.id, applicationId: app.id, fromStage: prev, toStage: s, actorId: creator, reason: s === 'REJECTED' ? 'Experience below requirement' : null },
      });
      prev = s;
    }
    if (stage === 'INTERVIEW') {
      await prisma.interview.create({
        data: {
          organisationId: org.id,
          applicationId: app.id,
          title: 'Technical interview',
          scheduledAt: new Date(now + 2 * 86_400_000),
          durationMinutes: 60,
          mode: 'VIDEO',
          location: 'https://meet.example.com/acme-tech',
          createdById: priya,
          interviewers: { create: [{ userId: priya }, { userId: admin }] },
        },
      });
    }
    if (stage === 'OFFER') {
      const offer = await prisma.offer.create({
        data: { organisationId: org.id, applicationId: app.id, title: 'Enterprise Sales Executive', salary: 2800000, currency: 'INR', status: 'PENDING_APPROVAL', createdById: arjun },
      });
      await prisma.offerHistory.createMany({
        data: [
          { offerId: offer.id, toStatus: 'DRAFT', actorId: arjun },
          { offerId: offer.id, fromStatus: 'DRAFT', toStatus: 'PENDING_APPROVAL', actorId: arjun },
        ],
      });
    }
  }

  await prisma.orgTask.createMany({
    data: [
      { organisationId: org.id, title: 'Review shortlisted React candidates', assigneeId: priya, createdById: admin, dueAt: new Date(now + 86_400_000) },
      { organisationId: org.id, title: 'Approve pending sales offer', assigneeId: owner, createdById: arjun, dueAt: new Date(now + 2 * 86_400_000) },
    ],
  });

  console.log(`Seeded organisation portal demo data for ${org.name}.`);
  console.log(`Sign in at /org/login with owner@acme.com, admin@acme.com, priya@acme.com or arjun@acme.com (password: ${process.env.ORG_SEED_PASSWORD ? '$ORG_SEED_PASSWORD' : password}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
