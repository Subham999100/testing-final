// ============================================================
// PLATFORM SUPER ADMIN
// Service: Platform Global Configuration & Integration Settings
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAllSettings() {
    const integrationDefaults = [
      {
        key: 'INTEGRATION_OPEN_SEARCH_ACTIVE',
        value: true,
        category: 'INTEGRATION',
        description: 'Enable OpenSearch index synchronisation',
        isPublic: false,
      },
      {
        key: 'INTEGRATION_GEMINI_AI',
        value: true,
        category: 'INTEGRATION',
        description: 'Enable Google Gemini AI services',
        isPublic: false,
      },
      {
        key: 'INTEGRATION_SMTP_ACTIVE',
        value: true,
        category: 'INTEGRATION',
        description: 'Enable SMTP platform email service',
        isPublic: false,
      },
    ];

    await Promise.all(
      integrationDefaults.map((setting) =>
        this.prisma.platformSetting.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        }),
      ),
    );

    return this.prisma.platformSetting.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async updateSetting(key: string, dto: UpdateSettingDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const existing = await this.prisma.platformSetting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`Platform setting '${key}' not found`);

    const updated = await this.prisma.platformSetting.update({
      where: { key },
      data: {
        value: dto.value,
        description: dto.description || existing.description,
        updatedById: actor.userId,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PLATFORM_SETTING_UPDATED',
      entityType: 'PLATFORM_SETTING',
      entityId: key,
      metadata: { key, oldValue: existing.isEncrypted ? '[REDACTED]' : existing.value, newValue: existing.isEncrypted ? '[REDACTED]' : dto.value },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }
}
