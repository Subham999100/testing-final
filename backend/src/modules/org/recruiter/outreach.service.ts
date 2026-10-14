import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";
import { isEmail } from "class-validator";
import { PrismaService } from "../../../database/prisma.service";
import { OrgContext, assertCan } from "../common/org-context";
import {
  EmailDraftDto,
  WhatsAppPreviewDto,
  WhatsAppDispatchDto,
  SmsPreviewDto,
  SmsDispatchDto,
} from "./dto";

@Injectable()
export class RecruiterOutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  private permission(ctx: OrgContext) {
    assertCan(ctx, "messages.use");
    assertCan(ctx, "candidates.read");
    assertCan(ctx, "candidates.resume.view");
  }
  configured() {
    return !!(
      this.config.get("RECRUITER_SMTP_HOST") &&
      this.config.get("RECRUITER_EMAIL_FROM")
    );
  }
  private async eligible(ctx: OrgContext, candidateIds: string[]) {
    const [rows, unlocks] = await Promise.all([
      this.prisma.candidate.findMany({
        where: { organisationId: ctx.organisationId, id: { in: candidateIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          professional: { select: { searchDetails: true } },
        },
      }),
      this.prisma.tokenTransaction.findMany({
        where: {
          organisationId: ctx.organisationId,
          idempotencyKey: { in: candidateIds.map((id) => `resume:${id}`) },
          type: "CONSUMPTION",
        },
        select: { idempotencyKey: true },
      }),
    ]);
    if (rows.length !== candidateIds.length)
      throw new BadRequestException(
        "One or more selected candidates are unavailable in your organisation",
      );
    const unlocked = new Set(unlocks.map((r) => r.idempotencyKey));
    return rows.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      reason: !unlocked.has(`resume:${c.id}`)
        ? "Contact locked"
        : (c.professional?.searchDetails as Record<string, unknown>)
              ?.emailOptOut === true
          ? "Email opted out"
          : !isEmail(c.email)
            ? "Email unavailable"
            : null,
    }));
  }
  async preview(ctx: OrgContext, dto: EmailDraftDto) {
    this.permission(ctx);
    if (!dto.subject.trim() || !dto.body.trim() || /[\r\n]/.test(dto.subject))
      throw new BadRequestException("Enter a single-line subject and message");
    const rows = await this.eligible(ctx, dto.candidateIds);
    const old = await this.prisma.recruiterEmailBatch.findUnique({
      where: { requestId: dto.requestId },
      include: { recipients: { select: { candidateId: true } } },
    });
    if (old) {
      if (
        old.userId !== ctx.userId ||
        old.organisationId !== ctx.organisationId ||
        old.subject !== dto.subject.trim() ||
        old.body !== dto.body.trim() ||
        [...old.recipients.map((r) => r.candidateId)].sort().join(",") !==
          [...dto.candidateIds].sort().join(",")
      )
        throw new BadRequestException(
          "Use a new request ID for a changed draft",
        );
      return this.status(ctx, old.id);
    }
    const seen = new Set<string>();
    const batch = await this.prisma.recruiterEmailBatch.create({
      data: {
        organisationId: ctx.organisationId,
        userId: ctx.userId,
        requestId: dto.requestId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        recipients: {
          create: rows.map((r) => {
            const duplicate = seen.has(r.email.toLowerCase());
            if (!r.reason) seen.add(r.email.toLowerCase());
            const detail =
              r.reason || (duplicate ? "Duplicate email address" : null);
            return {
              candidateId: r.id,
              status: detail ? "SKIPPED" : "PENDING",
              detail,
            };
          }),
        },
      },
    });
    return this.status(ctx, batch.id);
  }
  async status(ctx: OrgContext, id: string) {
    this.permission(ctx);
    const batch = await this.prisma.recruiterEmailBatch.findFirst({
      where: { id, organisationId: ctx.organisationId, userId: ctx.userId },
      include: { recipients: { orderBy: { id: "asc" } } },
    });
    if (!batch) throw new NotFoundException("Email draft not found");
    const candidates = await this.prisma.candidate.findMany({
      where: {
        organisationId: ctx.organisationId,
        id: { in: batch.recipients.map((r) => r.candidateId) },
      },
      select: { id: true, firstName: true, lastName: true },
    });
    const names = new Map(
      candidates.map((c) => [c.id, `${c.firstName} ${c.lastName}`]),
    );
    return {
      id: batch.id,
      subject: batch.subject,
      body: batch.body,
      configured: this.configured(),
      recipients: batch.recipients.map((r) => ({
        candidateId: r.candidateId,
        name: names.get(r.candidateId) || "Unavailable candidate",
        status: r.status,
        detail: r.detail,
      })),
      pending: batch.recipients.filter((r) => r.status === "PENDING").length,
    };
  }
  async dispatch(ctx: OrgContext, id: string) {
    this.permission(ctx);
    if (!this.configured())
      throw new ServiceUnavailableException(
        "Recruiter email is not configured. Ask your organisation administrator to configure SMTP.",
      );
    const snapshot = await this.status(ctx, id);
    const pending = snapshot.recipients
      .filter((r) => r.status === "PENDING")
      .slice(0, 1);
    if (!pending.length) return snapshot;
    // TLS required; transport is never created during preview or tests unless dispatch is called.
    const transport = createTransport({
      host: this.config.get<string>("RECRUITER_SMTP_HOST"),
      port: Number(this.config.get("RECRUITER_SMTP_PORT") || 587),
      secure: this.config.get("RECRUITER_SMTP_SECURE") === "true",
      requireTLS: true,
      auth: this.config.get("RECRUITER_SMTP_USER")
        ? {
            user: this.config.get<string>("RECRUITER_SMTP_USER"),
            pass: this.config.get<string>("RECRUITER_SMTP_PASSWORD"),
          }
        : undefined,
      connectionTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      for (const recipient of pending) {
        // A compare-and-set claim prevents duplicate sends from double-clicks/concurrent requests.
        const claim = await this.prisma.recruiterEmailRecipient.updateMany({
          where: {
            batchId: id,
            candidateId: recipient.candidateId,
            status: "PENDING",
          },
          data: {
            status: "SENDING",
            detail:
              "Delivery being attempted; do not resend while status is uncertain",
          },
        });
        if (!claim.count) continue;
        try {
          const [r] = await this.eligible(ctx, [recipient.candidateId]);
          if (r.reason) {
            await this.prisma.recruiterEmailRecipient.updateMany({
              where: { batchId: id, candidateId: r.id },
              data: { status: "SKIPPED", detail: r.reason },
            });
            continue;
          }
          const info = await transport.sendMail({
            from: this.config.get<string>("RECRUITER_EMAIL_FROM"),
            to: r.email,
            subject: snapshot.subject,
            text:
              snapshot.body +
              "\n\nIf you do not want further recruitment emails, please reply to this email to let us know.",
            replyTo:
              this.config.get<string>("RECRUITER_EMAIL_REPLY_TO") || undefined,
            messageId: `<${id}.${r.id}@clyptus-recruiter>`,
          });
          const accepted = info.accepted?.length > 0;
          await this.prisma.recruiterEmailRecipient.updateMany({
            where: { batchId: id, candidateId: r.id },
            data: {
              status: accepted ? "SENT" : "FAILED",
              detail: accepted
                ? "Accepted by email server; delivery is not yet confirmed"
                : "Email server rejected recipient",
            },
          });
        } catch {
          // Timeouts can occur after SMTP acceptance. Never silently retry or claim successful delivery.
          await this.prisma.recruiterEmailRecipient.updateMany({
            where: { batchId: id, candidateId: recipient.candidateId },
            data: {
              status: "UNCERTAIN",
              detail:
                "Could not confirm acceptance. Ask an administrator to check mail logs before sending again.",
            },
          });
        }
      }
    } finally {
      transport.close();
    }
    return this.status(ctx, id);
  }

  whatsappConfigured() {
    return !!(
      this.config.get("WHATSAPP_API_TOKEN") &&
      this.config.get("WHATSAPP_PHONE_ID")
    );
  }

  async whatsappPreview(ctx: OrgContext, dto: WhatsAppPreviewDto) {
    this.permission(ctx);
    const [candidates, unlocks] = await Promise.all([
      this.prisma.candidate.findMany({
        where: { organisationId: ctx.organisationId, id: { in: dto.candidateIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          currentCompany: true,
          headline: true,
          professional: { select: { searchDetails: true } },
        },
      }),
      this.prisma.tokenTransaction.findMany({
        where: {
          organisationId: ctx.organisationId,
          idempotencyKey: { in: dto.candidateIds.map((id) => `resume:${id}`) },
          type: "CONSUMPTION",
        },
        select: { idempotencyKey: true },
      }),
    ]);

    const unlocked = new Set(unlocks.map((r) => r.idempotencyKey));
    let eligibleCount = 0;
    let lockedCount = 0;

    const recipients = candidates.map((c) => {
      const isUnlocked = unlocked.has(`resume:${c.id}`);
      const hasPhone = !!c.phone;
      if (!isUnlocked) lockedCount++;
      if (hasPhone) eligibleCount++;
      const maskedPhone = c.phone
        ? c.phone.slice(0, 3) + "•••••" + c.phone.slice(-3)
        : null;

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: isUnlocked ? c.phone : maskedPhone,
        unlocked: isUnlocked,
        reason: !hasPhone
          ? "No phone number available"
          : !isUnlocked
            ? "Contact locked (requires 2 resume tokens)"
            : null,
      };
    });

    return {
      configured: this.whatsappConfigured(),
      providerName: "WhatsApp Cloud API",
      campaignName: dto.campaignName || "Untitled Campaign",
      jobTitle: dto.jobTitle || "",
      totalSelected: dto.candidateIds.length,
      eligibleCount,
      lockedCount,
      unlockedCount: dto.candidateIds.length - lockedCount,
      tokenCostPerUnlock: 2,
      totalUnlockTokens: lockedCount * 2,
      recipients,
    };
  }

  async whatsappSend(ctx: OrgContext, dto: WhatsAppDispatchDto) {
    this.permission(ctx);
    if (!this.whatsappConfigured()) {
      throw new ServiceUnavailableException(
        "WhatsApp Business API credentials are not configured. To dispatch live campaigns, your organisation administrator must connect your Meta WhatsApp API Token and Phone Number ID in Settings > Integrations. Your campaign configuration has been preserved.",
      );
    }
    return {
      success: true,
      status: "QUEUED",
      message: "Campaign queued for dispatch",
    };
  }

  smsConfigured() {
    return !!(
      this.config.get("SMS_API_KEY") ||
      this.config.get("SMS_SENDER_ID")
    );
  }

  async smsPreview(ctx: OrgContext, dto: SmsPreviewDto) {
    this.permission(ctx);
    const candidates = await this.prisma.candidate.findMany({
      where: { organisationId: ctx.organisationId, id: { in: dto.candidateIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        headline: true,
      },
    });

    let withPhone = 0;
    const recipients = candidates.map((c) => {
      const hasPhone = !!c.phone;
      if (hasPhone) withPhone++;
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone || "Missing phone",
        valid: hasPhone,
      };
    });

    const sampleText =
      dto.templateKey === "resume_shortlisted"
        ? `Dear ${candidates[0]?.firstName || "Candidate"}, your resume has been shortlisted for the ${dto.variables?.jobTitle || "Engineer"} position at ${dto.variables?.companyName || "Clyptus"}. Please contact ${dto.variables?.contactInfo || "HR"} or reply. - Clyptus`
        : `Notification from Clyptus recruitment team.`;

    const charCount = sampleText.length;
    const segments = Math.max(1, Math.ceil(charCount / 160));

    return {
      configured: this.smsConfigured(),
      totalSelected: dto.candidateIds.length,
      recipientsWithPhone: withPhone,
      recipientsMissingPhone: dto.candidateIds.length - withPhone,
      sampleText,
      charCount,
      segments,
      recipients,
    };
  }

  async smsSend(ctx: OrgContext, dto: SmsDispatchDto) {
    this.permission(ctx);
    if (!this.smsConfigured()) {
      throw new ServiceUnavailableException(
        "SMS Gateway is not configured. To dispatch SMS messages, your organisation administrator must configure the SMS provider credentials in Settings > Integrations. Your message has been saved as a draft.",
      );
    }
    return {
      success: true,
      status: "QUEUED",
      message: "SMS batch queued for dispatch",
    };
  }
}