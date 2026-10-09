// ============================================================
// ORGANISATION PORTAL — end-to-end tests against a real PostgreSQL
//   DATABASE_URL=... JWT_SECRET=... npm run test:e2e
// Covers: tenant isolation, escalation rules, the invitation chain
// (OSA → OA → Recruiter), concurrent token spending, and the
// Razorpay webhook (forged signature rejected, credit idempotent).
// All data it creates is removed afterwards.
// ============================================================

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/database/prisma.service';
import { OrgTokenService } from '../src/modules/org/common/org-token.service';
import { ROLE_DEFAULTS } from '../src/modules/org/common/org-permissions';

process.env.RAZORPAY_WEBHOOK_SECRET = 'e2e_webhook_secret';
process.env.NODE_ENV = 'test';

const run = crypto.randomBytes(4).toString('hex');
const PASSWORD = 'E2ePassword123';

describe('Organisation portal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;
  const orgIds: string[] = [];
  const userEmails: string[] = [];

  async function api(method: string, path: string, token?: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json as any };
  }

  async function createOrg(slug: string, balance: number) {
    const org = await prisma.organisation.create({
      data: {
        name: `E2E ${slug}`,
        slug: `e2e-${slug}-${run}`,
        contactEmail: `${slug}-${run}@e2e.test`,
        status: 'ACTIVE',
        recruiterLimit: 5,
        tokenBalance: { create: { balance, allocatedTokens: balance } },
      },
    });
    orgIds.push(org.id);
    await prisma.orgSettings.create({ data: { organisationId: org.id } });
    return org;
  }

  async function createOwner(orgId: string, tag: string) {
    const email = `owner-${tag}-${run}@e2e.test`;
    userEmails.push(email);
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        firstName: 'Owner',
        lastName: tag,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        organisationId: orgId,
        orgMemberProfile: { create: { organisationId: orgId, permissions: ROLE_DEFAULTS.ORGANISATION_SUPER_ADMIN } },
      },
    });
    return email;
  }

  async function login(email: string, password = PASSWORD) {
    const r = await api('POST', '/org/auth/login', undefined, { email, password });
    expect(r.status).toBe(200);
    return r.body.data.accessToken as string;
  }

  async function inviteAndAccept(token: string, email: string, role: 'ORGANISATION_ADMIN' | 'RECRUITER') {
    userEmails.push(email);
    const inv = await api('POST', '/org/invitations', token, { email, role });
    expect(inv.status).toBe(201);
    const inviteToken = new URL(inv.body.data.inviteUrl).searchParams.get('token');
    const acc = await api('POST', '/org/invitations/accept', undefined, { token: inviteToken, firstName: 'New', lastName: role, password: PASSWORD });
    expect(acc.status).toBe(200);
    return login(email);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0);
    base = await app.getUrl();
    base = base.replace('[::1]', 'localhost');
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({ where: { OR: [{ organisationId: { in: orgIds } }, { email: { in: userEmails } }] }, select: { id: true } });
      const ids = users.map((u) => u.id);
      const where = { organisationId: { in: orgIds } };
      await prisma.offerHistory.deleteMany({ where: { offer: where } });
      await prisma.offer.deleteMany({ where });
      await prisma.interview.deleteMany({ where });
      await prisma.applicationStageHistory.deleteMany({ where });
      await prisma.application.deleteMany({ where });
      await prisma.candidate.deleteMany({ where });
      await prisma.job.deleteMany({ where });
      for (const model of ['orgInvitation', 'orgSettings', 'tokenAllocation', 'memberTokenEntry', 'tokenReservation', 'orgPayment', 'orgNotification', 'orgTask', 'aiRun'] as const) {
        await (prisma[model] as any).deleteMany({ where });
      }
      await prisma.tokenTransaction.deleteMany({ where });
      await prisma.auditLog.deleteMany({ where: { OR: [where, { actorId: { in: ids } }] } });
      await prisma.securityEvent.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.platformSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.orgMemberProfile.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.organisationTokenBalance.deleteMany({ where });
      await prisma.organisation.deleteMany({ where: { id: { in: orgIds } } });
    }
    await app?.close();
  });

  it('isolates organisations: org A cannot see or touch org B resources', async () => {
    const orgA = await createOrg('a', 1000);
    const orgB = await createOrg('b', 1000);
    const tokenA = await login(await createOwner(orgA.id, 'a'));
    const ownerB = await prisma.user.findUnique({ where: { email: await createOwner(orgB.id, 'b') } });

    const jobB = await prisma.job.create({ data: { organisationId: orgB.id, title: 'Secret job', description: 'x', status: 'PUBLISHED', createdById: ownerB.id } });
    const candB = await prisma.candidate.create({ data: { organisationId: orgB.id, firstName: 'B', lastName: 'Cand', email: `b-${run}@e2e.test`, createdById: ownerB.id } });
    const appB = await prisma.application.create({ data: { organisationId: orgB.id, jobId: jobB.id, candidateId: candB.id, createdById: ownerB.id } });

    expect((await api('GET', `/org/jobs/${jobB.id}`, tokenA)).status).toBe(404);
    expect((await api('PATCH', `/org/jobs/${jobB.id}`, tokenA, { title: 'hacked' })).status).toBe(404);
    expect((await api('POST', `/org/jobs/${jobB.id}/actions/pause`, tokenA, {})).status).toBe(404);
    expect((await api('GET', `/org/candidates/${candB.id}`, tokenA)).status).toBe(404);
    expect((await api('POST', `/org/candidates/${candB.id}/unlock`, tokenA)).status).toBe(404);
    expect((await api('GET', `/org/applications/${appB.id}`, tokenA)).status).toBe(404);
    expect((await api('POST', `/org/applications/${appB.id}/move`, tokenA, { toStage: 'SCREENING' })).status).toBe(404);
    expect((await api('GET', `/org/members/${ownerB.id}`, tokenA)).status).toBe(404);
    expect((await api('POST', '/org/applications', tokenA, { jobId: jobB.id, candidateId: candB.id })).status).toBe(404);

    const list = await api('GET', '/org/jobs', tokenA);
    expect(list.body.data.map((j: { id: string }) => j.id)).not.toContain(jobB.id);
  });

  it('runs the invitation chain and blocks escalation', async () => {
    const org = await createOrg('chain', 500);
    const ownerToken = await login(await createOwner(org.id, 'chain'));

    // Above-ceiling grant is rejected.
    const bad = await api('POST', '/org/invitations', ownerToken, { email: `x-${run}@e2e.test`, role: 'RECRUITER', permissions: ['tokens.purchase'] });
    expect(bad.status).toBe(403);

    const adminToken = await inviteAndAccept(ownerToken, `oa-${run}@e2e.test`, 'ORGANISATION_ADMIN');
    const recruiterToken = await inviteAndAccept(adminToken, `rec-${run}@e2e.test`, 'RECRUITER');

    // Org admin cannot invite another org admin, buy tokens, or reach billing.
    expect((await api('POST', '/org/invitations', adminToken, { email: `oa2-${run}@e2e.test`, role: 'ORGANISATION_ADMIN' })).status).toBe(403);
    expect((await api('POST', '/org/billing/orders', adminToken, { planId: 'x' })).status).toBe(403);

    // Recruiter cannot manage members or change own permissions.
    const me = await api('GET', '/org/auth/me', recruiterToken);
    expect(me.body.data.user.role).toBe('RECRUITER');
    expect(me.body.data.permissions).not.toContain('tokens.purchase');
    expect((await api('PUT', `/org/members/${me.body.data.user.id}/permissions`, recruiterToken, { permissions: ['jobs.read.all'] })).status).toBe(403);
    expect((await api('GET', '/org/members', recruiterToken)).status).toBe(403);

    // Platform-only routes stay closed to org users.
    expect((await api('GET', '/platform/organisations', ownerToken)).status).toBe(403);
  });

  it('never overspends under 50 parallel consumes', async () => {
    const org = await createOrg('race', 100);
    const ownerEmail = await createOwner(org.id, 'race');
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    const tokens = app.get(OrgTokenService);
    const spender = { organisationId: org.id, userId: owner.id, role: UserRole.ORGANISATION_SUPER_ADMIN };

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) => tokens.consume(spender, { feature: 'TEST', amount: 5, idempotencyKey: `race-${run}-${i}` })),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const wallet = await prisma.organisationTokenBalance.findUnique({ where: { organisationId: org.id } });
    expect(ok).toBe(20);
    expect(wallet.balance).toBe(0);

    const ledger = await prisma.tokenTransaction.findMany({ where: { organisationId: org.id }, orderBy: { balanceAfter: 'desc' } });
    expect(ledger).toHaveLength(20);
    expect(new Set(ledger.map((l) => l.balanceAfter)).size).toBe(20); // every entry saw a distinct, correct balance

    // Replaying the same key never charges twice.
    await prisma.organisationTokenBalance.update({ where: { organisationId: org.id }, data: { balance: 10 } });
    const again = await tokens.consume(spender, { feature: 'TEST', amount: 5, idempotencyKey: `race-${run}-0` });
    expect(again.charged).toBe(false);
  });

  it('credits purchases only from a correctly signed webhook, exactly once', async () => {
    const org = await createOrg('pay', 0);
    const ownerEmail = await createOwner(org.id, 'pay');
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    const payment = await prisma.orgPayment.create({
      data: { organisationId: org.id, planId: 'plan', planName: 'Test plan', tokens: 1000, amount: 9900, currency: 'USD', razorpayOrderId: `order_${run}`, createdById: owner.id },
    });
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: `pay_${run}`, order_id: `order_${run}`, amount: 9900, currency: 'USD' } } },
    });
    const sign = (b: string) => crypto.createHmac('sha256', 'e2e_webhook_secret').update(b).digest('hex');

    const forged = await api('POST', '/org/billing/razorpay/webhook', undefined, body, { 'x-razorpay-signature': 'deadbeef' });
    expect(forged.status).toBe(400);
    expect((await prisma.organisationTokenBalance.findUnique({ where: { organisationId: org.id } })).balance).toBe(0);

    for (let i = 0; i < 3; i++) {
      const ok = await api('POST', '/org/billing/razorpay/webhook', undefined, body, { 'x-razorpay-signature': sign(body) });
      expect(ok.status).toBe(200);
    }
    expect((await prisma.organisationTokenBalance.findUnique({ where: { organisationId: org.id } })).balance).toBe(1000);
    expect((await prisma.orgPayment.findUnique({ where: { id: payment.id } })).status).toBe('PAID');
  });
});
