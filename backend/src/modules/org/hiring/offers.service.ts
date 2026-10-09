// ============================================================
// ORGANISATION PORTAL — Offers
// DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACCEPTED | REJECTED | EXPIRED
// (WITHDRAWN from any open state). Approver must differ from the creator.
// Accepting an offer moves the application to HIRED.
// ============================================================

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Offer, OfferStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../../integrations/email/email.service';
import { OrgContext, assertCan } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { applicationScope, pageResult, paging, userSummaries } from '../common/org-helpers';
import { OFFER_ACTION_PERMISSION, OfferAction, nextOfferStatus } from '../common/org-workflows';
import { ApplicationsService } from './applications.service';
import { OfferInputDto, OfferQueryDto, UpdateOfferDto } from './dto';

const OPEN_STATUSES: OfferStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'];

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly applications: ApplicationsService,
    private readonly email: EmailService,
  ) {}

  private async findScoped(ctx: OrgContext, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, organisationId: ctx.organisationId, application: applicationScope(ctx) },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  async list(ctx: OrgContext, q: OfferQueryDto) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.OfferWhereInput = { organisationId: ctx.organisationId, application: applicationScope(ctx) };
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { application: { candidate: { lastName: { contains: q.search, mode: 'insensitive' } } } },
        { application: { candidate: { firstName: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.offer.count({ where }),
      this.prisma.offer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          application: { select: { id: true, candidate: { select: { firstName: true, lastName: true } }, job: { select: { id: true, title: true } } } },
        },
      }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.createdById));
    return pageResult(
      rows.map((o) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        salary: o.salary,
        currency: o.currency,
        joiningDate: o.joiningDate,
        candidate: `${o.application.candidate.firstName} ${o.application.candidate.lastName}`,
        applicationId: o.application.id,
        job: o.application.job,
        createdBy: users.get(o.createdById)?.name ?? '—',
        createdById: o.createdById,
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
    );
  }

  async get(ctx: OrgContext, id: string) {
    const o = await this.prisma.offer.findFirst({
      where: { id, organisationId: ctx.organisationId, application: applicationScope(ctx) },
      include: {
        history: { orderBy: { createdAt: 'asc' } },
        application: { select: { id: true, stage: true, candidate: { select: { id: true, firstName: true, lastName: true } }, job: { select: { id: true, title: true } } } },
      },
    });
    if (!o) throw new NotFoundException('Offer not found');
    const settings = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    const users = await userSummaries(this.prisma, ctx.organisationId, [o.createdById, o.approvedById, ...o.history.map((h) => h.actorId)]);
    return {
      ...o,
      candidateName: `${o.application.candidate.firstName} ${o.application.candidate.lastName}`,
      createdBy: users.get(o.createdById)?.name ?? '—',
      approvedBy: o.approvedById ? users.get(o.approvedById)?.name ?? '—' : null,
      history: o.history.map((h) => ({ ...h, actor: users.get(h.actorId)?.name ?? 'Former member' })),
      approvalRequired: settings?.offerApprovalRequired ?? true,
      isCreator: o.createdById === ctx.userId,
    };
  }

  async create(ctx: OrgContext, dto: OfferInputDto) {
    const app = await this.applications.findScoped(ctx, dto.applicationId);
    this.applications.assertStage(app, ['INTERVIEW', 'OFFER'], 'create offers');
    const open = await this.prisma.offer.count({ where: { applicationId: app.id, status: { in: OPEN_STATUSES } } });
    if (open) throw new ConflictException('This application already has an open offer');

    const offer = await this.prisma.$transaction(async (tx) => {
      if (app.stage === 'INTERVIEW') await this.applications.applyStageChange(tx, ctx, app, 'OFFER', 'Offer drafted', true);
      const created = await tx.offer.create({
        data: {
          organisationId: ctx.organisationId,
          applicationId: app.id,
          title: dto.title.trim(),
          salary: dto.salary,
          currency: (dto.currency || 'INR').toUpperCase(),
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          notes: dto.notes,
          createdById: ctx.userId,
        },
      });
      await tx.offerHistory.create({ data: { offerId: created.id, toStatus: 'DRAFT', actorId: ctx.userId } });
      return created;
    });
    await this.events.audit(ctx, 'OFFER_CREATED', 'OFFER', offer.id, { applicationId: app.id, salary: dto.salary });
    this.events.emit(ctx.organisationId, 'offer.updated', { offerId: offer.id, applicationId: app.id });
    if (app.stage === 'INTERVIEW') {
      this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: app.id, jobId: app.jobId, from: 'INTERVIEW', to: 'OFFER' });
    }
    return offer;
  }

  async update(ctx: OrgContext, id: string, dto: UpdateOfferDto) {
    assertCan(ctx, 'offers.create');
    const o = await this.findScoped(ctx, id);
    if (o.status !== 'DRAFT') throw new BadRequestException('Only draft offers can be edited');
    const updated = await this.prisma.offer.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        salary: dto.salary,
        currency: dto.currency?.toUpperCase(),
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });
    await this.events.audit(ctx, 'OFFER_UPDATED', 'OFFER', id, { fields: Object.keys(dto) });
    this.events.emit(ctx.organisationId, 'offer.updated', { offerId: id });
    return updated;
  }

  async action(ctx: OrgContext, id: string, action: OfferAction, note?: string) {
    assertCan(ctx, OFFER_ACTION_PERMISSION[action]);
    const o = await this.findScoped(ctx, id);
    const settings = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    const next = nextOfferStatus(o.status, action, settings?.offerApprovalRequired ?? true);
    if (!next) throw new BadRequestException(`Cannot ${action} an offer that is ${o.status.replace('_', ' ').toLowerCase()}`);
    if ((action === 'approve' || action === 'reject') && o.createdById === ctx.userId) {
      throw new ForbiddenException('You cannot approve or reject your own offer');
    }
    if (action === 'reject' && !note?.trim()) throw new BadRequestException('Add a note explaining the rejection');

    const now = new Date();
    const data: Prisma.OfferUpdateManyMutationInput = { status: next };
    if (next === 'APPROVED') data.approvedById = ctx.userId;
    if (next === 'SENT') data.sentAt = now;
    if (['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(next)) data.respondedAt = now;

    await this.prisma.$transaction(async (tx) => {
      const res = await tx.offer.updateMany({ where: { id, status: o.status }, data });
      if (!res.count) throw new ConflictException('The offer was changed by someone else. Refresh and try again.');
      await tx.offerHistory.create({ data: { offerId: id, fromStatus: o.status, toStatus: next, actorId: ctx.userId, note: note?.trim() || null } });
      if (next === 'ACCEPTED') {
        const app = await tx.application.findUnique({ where: { id: o.applicationId } });
        if (app.stage === 'OFFER') await this.applications.applyStageChange(tx, ctx, app, 'HIRED', 'Offer accepted', true);
      }
    });

    await this.events.audit(ctx, `OFFER_${action.toUpperCase()}`, 'OFFER', id, { from: o.status, to: next, note });
    this.events.emit(ctx.organisationId, 'offer.updated', { offerId: id, applicationId: o.applicationId });
    if (next === 'ACCEPTED') this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: o.applicationId, to: 'HIRED' });
    await this.sideEffects(ctx, o, action, next, note);
    return this.get(ctx, id);
  }

  private async sideEffects(ctx: OrgContext, o: Offer, action: OfferAction, next: OfferStatus, note?: string) {
    if (next === 'PENDING_APPROVAL') {
      const approvers = await this.events.membersWithPermission(ctx.organisationId, 'offers.approve');
      await this.events.notify(ctx.organisationId, approvers.filter((u) => u !== o.createdById), {
        type: 'offer.approval',
        title: `Offer awaiting approval: ${o.title}`,
        link: `/org/offers/${o.id}`,
      }, ctx.userId);
    }
    if (action === 'approve' || action === 'reject') {
      await this.events.notify(ctx.organisationId, [o.createdById], {
        type: 'offer.decision',
        title: `Offer "${o.title}" was ${action === 'approve' ? 'approved' : 'sent back'}`,
        body: note,
        link: `/org/offers/${o.id}`,
      }, ctx.userId);
    }
    if (next === 'SENT') {
      const app = await this.prisma.application.findUnique({
        where: { id: o.applicationId },
        select: { candidate: { select: { email: true, firstName: true } } },
      });
      await this.email.sendMail({
        to: app.candidate.email,
        subject: `Your offer from ${ctx.organisationName}`,
        html: `<p>Hi ${app.candidate.firstName.replace(/[<>&]/g, '')},</p><p>${ctx.organisationName.replace(/[<>&]/g, '')} has sent you an offer for <b>${o.title.replace(/[<>&]/g, '')}</b>. Your recruiter will share the details.</p>`,
      });
    }
  }
}
