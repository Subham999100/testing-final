// ============================================================
// PLATFORM SUPER ADMIN
// Service: Platform Analytics & Intelligence Aggregation
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { GeminiAiService } from '../../../integrations/ai/gemini.service';

@Injectable()
export class PlatformAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiAiService,
  ) {}

  async getPlatformAnalytics(timeframe = '30d') {
    // 1. Organisation status breakdown
    const statusGroups = await this.prisma.organisation.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // 2. Organisation tier breakdown
    const tierGroups = await this.prisma.organisation.groupBy({
      by: ['tier'],
      _count: { id: true },
    });

    // 3. Token transaction volume by type
    const txTypeGroups = await this.prisma.tokenTransaction.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { amount: true },
    });

    // 4. Monthly organisation growth (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const orgs = await this.prisma.organisation.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const monthMap: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthMap[key] = 0;
    }

    for (const org of orgs) {
      const key = org.createdAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (monthMap[key] !== undefined) {
        monthMap[key]++;
      }
    }

    const growthTrend = Object.entries(monthMap).map(([month, count]) => ({
      month,
      newOrganisations: count,
    }));

    // 5. Generate AI Platform Executive Summary
    const aiSummary = await this.geminiService.generatePlatformSummary({
      statusDistribution: statusGroups,
      tierDistribution: tierGroups,
      transactions: txTypeGroups,
      timeframe,
    });

    return {
      timeframe,
      statusDistribution: statusGroups.map((g) => ({ status: g.status, count: g._count.id })),
      tierDistribution: tierGroups.map((g) => ({ tier: g.tier, count: g._count.id })),
      transactionVolumeByType: txTypeGroups.map((g) => ({
        type: g.type,
        count: g._count.id,
        totalTokens: g._sum.amount || 0,
      })),
      organisationGrowthTrend: growthTrend,
      aiExecutiveSummary: aiSummary,
    };
  }
}
