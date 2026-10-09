// ============================================================
// ORGANISATION PORTAL — Notifications, announcements, tasks and
// candidate messaging. Admins can only read other members'
// messages when the org's privacy policy (messageOversight) allows it.
// ============================================================

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../../integrations/email/email.service';
import { OrgContext, can } from '../common/org-context';
import { NOTIFICATION_TYPES, OrgEventsService } from '../common/org-events.service';
import { pageResult, paging, userSummaries } from '../common/org-helpers';
import { MessageDto, NotificationQueryDto, TaskInputDto, TaskQueryDto } from './dto';

@Injectable()
export class EngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly email: EmailService,
  ) {}

  // ---------------- notifications ----------------

  async notifications(ctx: OrgContext, q: NotificationQueryDto) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.OrgNotificationWhereInput = { organisationId: ctx.organisationId, userId: ctx.userId };
    if (q.unread === 'true') where.readAt = null;
    const [total, rows, unread] = await Promise.all([
      this.prisma.orgNotification.count({ where }),
      this.prisma.orgNotification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.orgNotification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);
    return { ...pageResult(rows, total, page, limit), unread };
  }

  async markRead(ctx: OrgContext, id: string) {
    await this.prisma.orgNotification.updateMany({ where: { id, userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
    return { id, read: true };
  }

  async markAllRead(ctx: OrgContext) {
    const res = await this.prisma.orgNotification.updateMany({ where: { userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: res.count };
  }

  async preferences(ctx: OrgContext) {
    const p = await this.prisma.orgMemberProfile.findUnique({ where: { userId: ctx.userId }, select: { mutedNotificationTypes: true } });
    return { types: NOTIFICATION_TYPES, muted: p?.mutedNotificationTypes ?? [] };
  }

  async updatePreferences(ctx: OrgContext, muted: string[]) {
    const valid = [...new Set(muted)].filter((t) => (NOTIFICATION_TYPES as readonly string[]).includes(t));
    await this.prisma.orgMemberProfile.update({ where: { userId: ctx.userId }, data: { mutedNotificationTypes: valid } });
    return { types: NOTIFICATION_TYPES, muted: valid };
  }

  async announce(ctx: OrgContext, title: string, body?: string) {
    const members = await this.prisma.orgMemberProfile.findMany({
      where: { organisationId: ctx.organisationId, status: 'ACTIVE' },
      select: { userId: true },
    });
    await this.events.notify(ctx.organisationId, members.map((m) => m.userId), { type: 'announcement', title, body });
    await this.events.audit(ctx, 'ANNOUNCEMENT_SENT', 'ORGANISATION', ctx.organisationId, { title, recipients: members.length });
    return { recipients: members.length };
  }

  // ---------------- tasks ----------------

  private async assertMember(ctx: OrgContext, userId: string) {
    const m = await this.prisma.orgMemberProfile.findFirst({ where: { userId, organisationId: ctx.organisationId, status: 'ACTIVE' } });
    if (!m) throw new BadRequestException('Assignee must be an active member of your organisation');
  }

  private async findTask(ctx: OrgContext, id: string) {
    const t = await this.prisma.orgTask.findFirst({
      where: { id, organisationId: ctx.organisationId, OR: [{ assigneeId: ctx.userId }, { createdById: ctx.userId }] },
    });
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  async tasks(ctx: OrgContext, q: TaskQueryDto) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.OrgTaskWhereInput = { organisationId: ctx.organisationId };
    if (q.scope === 'created') where.createdById = ctx.userId;
    else where.assigneeId = ctx.userId;
    if (q.status) where.status = q.status;
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    const [total, rows] = await Promise.all([
      this.prisma.orgTask.count({ where }),
      this.prisma.orgTask.findMany({ where, skip, take: limit, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }] }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.flatMap((r) => [r.assigneeId, r.createdById]));
    return pageResult(
      rows.map((t) => ({
        ...t,
        assignee: users.get(t.assigneeId)?.name ?? 'Former member',
        createdBy: users.get(t.createdById)?.name ?? 'Former member',
        overdue: t.status === 'OPEN' && !!t.dueAt && t.dueAt < new Date(),
      })),
      total,
      page,
      limit,
    );
  }

  async createTask(ctx: OrgContext, dto: TaskInputDto) {
    const assigneeId = dto.assigneeId ?? ctx.userId;
    if (assigneeId !== ctx.userId) await this.assertMember(ctx, assigneeId);
    const task = await this.prisma.orgTask.create({
      data: {
        organisationId: ctx.organisationId,
        title: dto.title.trim(),
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        assigneeId,
        createdById: ctx.userId,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
      },
    });
    this.events.emitToUser(assigneeId, 'task.updated', { taskId: task.id });
    await this.events.notify(ctx.organisationId, [assigneeId], { type: 'task.assigned', title: `New task: ${task.title}`, link: '/org/tasks' }, ctx.userId);
    return task;
  }

  async updateTask(ctx: OrgContext, id: string, dto: Partial<TaskInputDto>) {
    const t = await this.findTask(ctx, id);
    if (dto.assigneeId && dto.assigneeId !== t.assigneeId) await this.assertMember(ctx, dto.assigneeId);
    const task = await this.prisma.orgTask.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        assigneeId: dto.assigneeId,
      },
    });
    this.events.emitToUser(task.assigneeId, 'task.updated', { taskId: id });
    return task;
  }

  async toggleTask(ctx: OrgContext, id: string) {
    const t = await this.findTask(ctx, id);
    const done = t.status === 'OPEN';
    const task = await this.prisma.orgTask.update({
      where: { id },
      data: { status: done ? 'DONE' : 'OPEN', completedAt: done ? new Date() : null },
    });
    this.events.emitToUser(t.createdById, 'task.updated', { taskId: id });
    this.events.emitToUser(t.assigneeId, 'task.updated', { taskId: id });
    return task;
  }

  async deleteTask(ctx: OrgContext, id: string) {
    const t = await this.findTask(ctx, id);
    if (t.createdById !== ctx.userId) throw new ForbiddenException('Only the creator can delete a task');
    await this.prisma.orgTask.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ---------------- messaging ----------------

  private async canOversee(ctx: OrgContext) {
    if (!can(ctx, 'messages.oversee')) return false;
    const s = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    return !!s?.messageOversight;
  }

  async conversations(ctx: OrgContext) {
    const oversee = await this.canOversee(ctx);
    const where: Prisma.CandidateMessageWhereInput = { organisationId: ctx.organisationId };
    if (!oversee) where.senderId = ctx.userId;
    const rows = await this.prisma.candidateMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { candidate: { select: { id: true, firstName: true, lastName: true, headline: true } } },
    });
    const byCandidate = new Map<string, { candidate: { id: string; name: string; headline: string | null }; lastMessage: string; lastAt: Date; count: number }>();
    for (const m of rows) {
      const existing = byCandidate.get(m.candidateId);
      if (existing) existing.count++;
      else
        byCandidate.set(m.candidateId, {
          candidate: { id: m.candidate.id, name: `${m.candidate.firstName} ${m.candidate.lastName}`, headline: m.candidate.headline },
          lastMessage: m.body.slice(0, 140),
          lastAt: m.createdAt,
          count: 1,
        });
    }
    return { oversight: oversee, conversations: [...byCandidate.values()] };
  }

  async thread(ctx: OrgContext, candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, organisationId: ctx.organisationId },
      select: { id: true, firstName: true, lastName: true, headline: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const oversee = await this.canOversee(ctx);
    const rows = await this.prisma.candidateMessage.findMany({
      where: { organisationId: ctx.organisationId, candidateId, ...(oversee ? {} : { senderId: ctx.userId }) },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.senderId));
    return {
      candidate: { ...candidate, name: `${candidate.firstName} ${candidate.lastName}` },
      messages: rows.map((m) => ({ ...m, sender: users.get(m.senderId)?.name ?? 'Former member', mine: m.senderId === ctx.userId })),
    };
  }

  async send(ctx: OrgContext, candidateId: string, dto: MessageDto) {
    const candidate = await this.prisma.candidate.findFirst({ where: { id: candidateId, organisationId: ctx.organisationId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const message = await this.prisma.candidateMessage.create({
      data: { organisationId: ctx.organisationId, candidateId, senderId: ctx.userId, subject: dto.subject, body: dto.body.trim() },
    });
    const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]);
    await this.email.sendMail({
      to: candidate.email,
      subject: dto.subject || `Message from ${ctx.organisationName}`,
      html: `<p>${safe(dto.body).replace(/\n/g, '<br/>')}</p><p>— ${safe(`${ctx.firstName} ${ctx.lastName}`)}, ${safe(ctx.organisationName)}</p>`,
      text: dto.body,
    });
    await this.events.audit(ctx, 'CANDIDATE_MESSAGE_SENT', 'CANDIDATE', candidateId, { messageId: message.id });
    this.events.emitToUser(ctx.userId, 'message.created', { candidateId });
    return { ...message, sender: `${ctx.firstName} ${ctx.lastName}`, mine: true };
  }
}
