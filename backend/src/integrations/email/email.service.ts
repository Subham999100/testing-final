// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Integration: Email Notification Service
//
// TODO(INTEGRATION): Connect with Nodemailer / SendGrid / AWS SES
// for dispatching platform alerts, admin invitation emails, and
// security incident alerts.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    this.logger.log(`Email Service interface ready [Host: ${host || 'Local Mock Service'}]`);
  }

  async sendMail(options: SendEmailOptions): Promise<boolean> {
    this.logger.log(`[TODO: EMAIL DISPATCH] Sent to: ${options.to}, Subject: "${options.subject}"`);
    return true;
  }

  async sendPlatformSecurityAlert(subject: string, details: string): Promise<boolean> {
    const recipient = this.configService.get<string>('SECURITY_ALERT_EMAIL', 'security@clyptus.platform');
    return this.sendMail({
      to: recipient,
      subject: `[SECURITY ALERT] ${subject}`,
      html: `<div style="font-family: sans-serif; color: #111;"><h2>Platform Security Alert</h2><p>${details}</p></div>`,
    });
  }
}
