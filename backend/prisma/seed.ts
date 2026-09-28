// ============================================================
// Clyptus Job Portal - Prisma Database Seeder
// Module: Platform Super Admin Initial Setup
// ============================================================

import { PrismaClient, UserRole, OrganisationStatus, BillingCycle } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Platform Super Admin initial data...');

  // 1. Create Default Platform Super Admin
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('SuperAdmin@123456!', salt);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@clyptus.platform' },
    update: {},
    create: {
      email: 'superadmin@clyptus.platform',
      passwordHash,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log(`Created Super Admin: ${superAdmin.email} (${superAdmin.id})`);

  // 2. Create Initial Token Plans
  const plans = [
    {
      name: 'Starter Plan',
      code: 'PLAN_STARTER',
      description: 'Ideal for growing companies with up to 5 job openings',
      tokenAmount: 1000,
      priceCents: 9900,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      features: ['5 Active Job Posts', 'Resume Parsing', 'Basic Support'],
      sortOrder: 1,
    },
    {
      name: 'Growth Plan',
      code: 'PLAN_GROWTH',
      description: 'For scaling companies with advanced recruitment workflows',
      tokenAmount: 5000,
      priceCents: 39900,
      currency: 'USD',
      billingCycle: BillingCycle.MONTHLY,
      features: ['Unlimited Job Posts', 'AI Candidate Matching', 'ATS Integration', 'Priority Support'],
      sortOrder: 2,
    },
    {
      name: 'Enterprise Plan',
      code: 'PLAN_ENTERPRISE',
      description: 'Dedicated capacity and volume token discounts for enterprises',
      tokenAmount: 25000,
      priceCents: 149900,
      currency: 'USD',
      billingCycle: BillingCycle.ANNUAL,
      features: ['Custom Token Allocation', 'Dedicated Account Manager', 'Custom Workflows', 'SSO & Audit Export'],
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.tokenPlan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }
  console.log('Seeded token plans');

  // 3. Create Initial Platform Settings
  const settings = [
    {
      key: 'PLATFORM_NAME',
      value: 'Clyptus Recruitment Platform',
      category: 'GENERAL',
      description: 'Global name for the multi-tenant recruitment portal',
      isPublic: true,
    },
    {
      key: 'SECURITY_MFA_ENFORCED',
      value: false,
      category: 'SECURITY',
      description: 'Enforce multi-factor authentication for platform personnel',
      isPublic: false,
    },
    {
      key: 'TOKEN_EXPIRY_DAYS',
      value: 365,
      category: 'BILLING',
      description: 'Default token validity in days before expiration',
      isPublic: false,
    },
    {
      key: 'INTEGRATION_RAZORPAY_ACTIVE',
      value: true,
      category: 'INTEGRATION',
      description: 'Enable Razorpay payment gateway integration',
      isPublic: false,
    },
    {
      key: 'INTEGRATION_STRIPE_ACTIVE',
      value: true,
      category: 'INTEGRATION',
      description: 'Enable Stripe payment gateway integration',
      isPublic: false,
    },
    {
      key: 'INTEGRATION_OPEN_SEARCH_ACTIVE',
      value: true,
      category: 'INTEGRATION',
      description: 'Enable OpenSearch index synchronisation',
      isPublic: false,
    },
  ];

  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('Seeded platform settings');

  // 4. Create Sample Organisation for Platform Super Admin oversight testing
  const sampleOrg = await prisma.organisation.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      domain: 'acme.com',
      contactEmail: 'talent@acme.com',
      contactPhone: '+1-555-0199',
      status: OrganisationStatus.ACTIVE,
      tier: 'ENTERPRISE',
      maxRecruiters: 20,
      metadata: {
        create: {
          industry: 'Information Technology',
          companySize: '500-1000',
          website: 'https://acme.com',
        },
      },
      tokenBalance: {
        create: {
          balance: 8500,
          allocatedTokens: 10000,
          consumedTokens: 1500,
          reservedTokens: 0,
        },
      },
      allocationLimit: {
        create: {
          monthlyMaxAllocation: 25000,
          singleTxLimit: 10000,
        },
      },
    },
  });
  console.log(`Created sample organisation: ${sampleOrg.name} (${sampleOrg.id})`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
