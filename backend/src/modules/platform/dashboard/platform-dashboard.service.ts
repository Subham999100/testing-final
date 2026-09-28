// ============================================================
// PLATFORM SUPER ADMIN
// Service: Platform Dashboard Overview Aggregation
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ObservabilityService } from '../../../integrations/observability/observability.service';
import { OrganisationStatus, UserRole } from '@prisma/client';

@Injectable()
export class PlatformDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observabilityService: ObservabilityService,
  ) {}

  async getDashboardSummary() {
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      totalUsers,
      platformAdmins,
      tokenAggregates,
      recentOrgs,
      recentTransactions,
      recentSecurityEvents,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.organisation.count(),
      this.prisma.organisation.count({ where: { status: OrganisationStatus.ACTIVE } }),
      this.prisma.organisation.count({ where: { status: OrganisationStatus.SUSPENDED } }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { role: { in: [UserRole.PLATFORM_ADMIN, UserRole.PLATFORM_SUPER_ADMIN] } },
      }),
      this.prisma.organisationTokenBalance.aggregate({
        _sum: {
          balance: true,
          allocatedTokens: true,
          consumedTokens: true,
        },
      }),
      this.prisma.organisation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
          status: true,
          tier: true,
          createdAt: true,
        },
      }),
      this.prisma.tokenTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.securityEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
          organisation: { select: { id: true, name: true } },
        },
      }),
    ]);

    const systemHealth = this.observabilityService.getHealthStatus();

    return {
      metrics: {
        totalOrganisations: totalOrgs,
        activeOrganisations: activeOrgs,
        suspendedOrganisations: suspendedOrgs,
        pendingOrganisations: totalOrgs - (activeOrgs + suspendedOrgs),
        totalPlatformUsers: totalUsers,
        totalPlatformAdmins: platformAdmins,
        tokenMetrics: {
          totalActiveTokens: tokenAggregates._sum.balance || 0,
          totalAllocatedTokens: tokenAggregates._sum.allocatedTokens || 0,
          totalConsumedTokens: tokenAggregates._sum.consumedTokens || 0,
        },
      },
      recentOrganisations: recentOrgs,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        organisationId: tx.organisationId,
        organisationName: tx.organisation.name,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balanceAfter,
        createdAt: tx.createdAt,
      })),
      recentSecurityEvents,
      recentAuditLogs,
      systemHealth,
    };
  }
}
