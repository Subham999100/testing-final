// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service: Platform Reports & Analytics Aggregation
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  Prisma,
  OrganisationStatus,
  UserRole,
  JobStatus,
  ApplicationStage,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QueryReportDto, ReportTimeframe } from './dto/query-report.dto';

export interface DateFilterRange {
  start?: Date;
  end?: Date;
}

@Injectable()
export class PlatformReportsService {
  private readonly logger = new Logger(PlatformReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to parse date filters from timeframe or custom dates
   */
  private parseDateFilter(query: QueryReportDto): DateFilterRange {
    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : undefined;
      const end = query.endDate ? new Date(query.endDate) : new Date();
      if (start && isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (end && isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      return { start, end };
    }

    const now = new Date();
    switch (query.timeframe) {
      case ReportTimeframe.TODAY: {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      }
      case ReportTimeframe.LAST_7_DAYS: {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      }
      case ReportTimeframe.LAST_30_DAYS:
      default: {
        if (query.timeframe === ReportTimeframe.ALL) {
          return {};
        }
        if (query.timeframe === ReportTimeframe.LAST_90_DAYS) {
          const start = new Date(now);
          start.setDate(now.getDate() - 90);
          return { start, end: now };
        }
        if (query.timeframe === ReportTimeframe.THIS_YEAR) {
          const start = new Date(now.getFullYear(), 0, 1);
          return { start, end: now };
        }
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        return { start, end: now };
      }
    }
  }

  /**
   * Primary reporting overview endpoint returning aggregate data across all models
   */
  async getOverview(query: QueryReportDto) {
    const { start, end } = this.parseDateFilter(query);
    const dateWhere = start && end ? { gte: start, lte: end } : start ? { gte: start } : undefined;

    const orgId = query.organisationId;

    // 1. Organisations metrics
    const orgWhere: Prisma.OrganisationWhereInput = orgId ? { id: orgId } : {};
    const [
      totalOrgs,
      activeOrgs,
      suspendedOrgs,
      pendingOrgs,
      newOrgsInPeriod,
    ] = await Promise.all([
      this.prisma.organisation.count({ where: orgWhere }),
      this.prisma.organisation.count({
        where: { ...orgWhere, status: OrganisationStatus.ACTIVE },
      }),
      this.prisma.organisation.count({
        where: { ...orgWhere, status: OrganisationStatus.SUSPENDED },
      }),
      this.prisma.organisation.count({
        where: { ...orgWhere, status: OrganisationStatus.PENDING_VERIFICATION },
      }),
      dateWhere
        ? this.prisma.organisation.count({
            where: { ...orgWhere, createdAt: dateWhere },
          })
        : this.prisma.organisation.count({ where: orgWhere }),
    ]);

    // 2. Users & Recruiters metrics
    const userWhere: Prisma.UserWhereInput = orgId ? { organisationId: orgId } : {};
    const [
      totalUsers,
      activeUsers,
      totalRecruiters,
      activeRecruiters,
      usersByRoleRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.count({ where: { ...userWhere, isActive: true } }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          role: { in: [UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN] },
        },
      }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          role: { in: [UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN] },
          isActive: true,
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: userWhere,
        _count: { id: true },
      }),
    ]);

    const usersByRole = usersByRoleRaw.map((r) => ({
      role: r.role,
      count: r._count.id,
    }));

    // 3. Jobs metrics
    const jobWhere: Prisma.JobWhereInput = orgId ? { organisationId: orgId } : {};
    const [
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      jobsInPeriod,
    ] = await Promise.all([
      this.prisma.job.count({ where: jobWhere }),
      this.prisma.job.count({ where: { ...jobWhere, status: JobStatus.PUBLISHED } }),
      this.prisma.job.count({ where: { ...jobWhere, status: JobStatus.DRAFT } }),
      this.prisma.job.count({ where: { ...jobWhere, status: JobStatus.CLOSED } }),
      dateWhere
        ? this.prisma.job.count({ where: { ...jobWhere, createdAt: dateWhere } })
        : this.prisma.job.count({ where: jobWhere }),
    ]);

    // 4. Applications metrics
    const appWhere: Prisma.ApplicationWhereInput = orgId ? { organisationId: orgId } : {};
    const [
      totalApplications,
      applicationsInPeriod,
      stageGroupsRaw,
    ] = await Promise.all([
      this.prisma.application.count({ where: appWhere }),
      dateWhere
        ? this.prisma.application.count({ where: { ...appWhere, createdAt: dateWhere } })
        : this.prisma.application.count({ where: appWhere }),
      this.prisma.application.groupBy({
        by: ['stage'],
        where: appWhere,
        _count: { id: true },
      }),
    ]);

    const applicationsByStage = stageGroupsRaw.map((s) => ({
      stage: s.stage,
      count: s._count.id,
    }));

    // 5. Monthly Trend Activity (Past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [recentOrgsList, recentJobsList, recentAppsList] = await Promise.all([
      this.prisma.organisation.findMany({
        where: {
          ...(orgId ? { id: orgId } : {}),
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true },
      }),
      this.prisma.job.findMany({
        where: {
          ...(orgId ? { organisationId: orgId } : {}),
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true },
      }),
      this.prisma.application.findMany({
        where: {
          ...(orgId ? { organisationId: orgId } : {}),
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    const monthlyTrends: { month: string; organisations: number; jobs: number; applications: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const yearMonth = `${d.getFullYear()}-${d.getMonth()}`;

      const orgCount = recentOrgsList.filter((o) => {
        const od = new Date(o.createdAt);
        return `${od.getFullYear()}-${od.getMonth()}` === yearMonth;
      }).length;

      const jobCount = recentJobsList.filter((j) => {
        const jd = new Date(j.createdAt);
        return `${jd.getFullYear()}-${jd.getMonth()}` === yearMonth;
      }).length;

      const appCount = recentAppsList.filter((a) => {
        const ad = new Date(a.createdAt);
        return `${ad.getFullYear()}-${ad.getMonth()}` === yearMonth;
      }).length;

      monthlyTrends.push({
        month: label,
        organisations: orgCount,
        jobs: jobCount,
        applications: appCount,
      });
    }

    // 6. Top Organisations list with calculated aggregates
    const topOrgs = await this.prisma.organisation.findMany({
      where: orgId ? { id: orgId } : {},
      take: 15,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        tier: true,
        createdAt: true,
        _count: {
          select: {
            users: {
              where: {
                role: { in: [UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN] },
              },
            },
          },
        },
      },
    });

    const orgIds = topOrgs.map((o) => o.id);

    const [jobCountsByOrg, appCountsByOrg] = await Promise.all([
      this.prisma.job.groupBy({
        by: ['organisationId'],
        where: { organisationId: { in: orgIds } },
        _count: { id: true },
      }),
      this.prisma.application.groupBy({
        by: ['organisationId'],
        where: { organisationId: { in: orgIds } },
        _count: { id: true },
      }),
    ]);

    const jobCountMap = new Map(jobCountsByOrg.map((j) => [j.organisationId, j._count.id]));
    const appCountMap = new Map(appCountsByOrg.map((a) => [a.organisationId, a._count.id]));

    const topOrganisations = topOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      tier: org.tier,
      recruiters: org._count.users,
      jobs: jobCountMap.get(org.id) || 0,
      applications: appCountMap.get(org.id) || 0,
      createdAt: org.createdAt,
    }));

    return {
      timeframe: query.timeframe || ReportTimeframe.LAST_30_DAYS,
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
      organisationId: orgId || null,
      organisations: {
        total: totalOrgs,
        active: activeOrgs,
        suspended: suspendedOrgs,
        pending: pendingOrgs,
        createdInPeriod: newOrgsInPeriod,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole,
      },
      recruiters: {
        total: totalRecruiters,
        active: activeRecruiters,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        draft: draftJobs,
        closed: closedJobs,
        createdInPeriod: jobsInPeriod,
      },
      applications: {
        total: totalApplications,
        appliedInPeriod: applicationsInPeriod,
        byStage: applicationsByStage,
      },
      trends: monthlyTrends,
      topOrganisations,
    };
  }

  /**
   * Dedicated Organisations Report drill-down
   */
  async getOrganisationsReport(query: QueryReportDto) {
    const { start, end } = this.parseDateFilter(query);
    const dateWhere = start && end ? { gte: start, lte: end } : start ? { gte: start } : undefined;

    const [statusDistribution, tierDistribution, total] = await Promise.all([
      this.prisma.organisation.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.organisation.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),
      this.prisma.organisation.count(),
    ]);

    return {
      total,
      dateRange: { start, end },
      statusDistribution: statusDistribution.map((s) => ({ status: s.status, count: s._count.id })),
      tierDistribution: tierDistribution.map((t) => ({ tier: t.tier, count: t._count.id })),
    };
  }

  /**
   * Dedicated Users Report drill-down
   */
  async getUsersReport(query: QueryReportDto) {
    const userWhere: Prisma.UserWhereInput = query.organisationId
      ? { organisationId: query.organisationId }
      : {};

    const [roles, total, active] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: userWhere,
        _count: { id: true },
      }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.count({ where: { ...userWhere, isActive: true } }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      roles: roles.map((r) => ({ role: r.role, count: r._count.id })),
    };
  }

  /**
   * Dedicated Jobs Report drill-down
   */
  async getJobsReport(query: QueryReportDto) {
    const jobWhere: Prisma.JobWhereInput = query.organisationId
      ? { organisationId: query.organisationId }
      : {};

    const [statuses, workModes, employmentTypes, total] = await Promise.all([
      this.prisma.job.groupBy({
        by: ['status'],
        where: jobWhere,
        _count: { id: true },
      }),
      this.prisma.job.groupBy({
        by: ['workMode'],
        where: jobWhere,
        _count: { id: true },
      }),
      this.prisma.job.groupBy({
        by: ['employmentType'],
        where: jobWhere,
        _count: { id: true },
      }),
      this.prisma.job.count({ where: jobWhere }),
    ]);

    return {
      total,
      byStatus: statuses.map((s) => ({ status: s.status, count: s._count.id })),
      byWorkMode: workModes.map((w) => ({ workMode: w.workMode, count: w._count.id })),
      byEmploymentType: employmentTypes.map((e) => ({
        employmentType: e.employmentType,
        count: e._count.id,
      })),
    };
  }

  /**
   * Dedicated Applications Report drill-down
   */
  async getApplicationsReport(query: QueryReportDto) {
    const appWhere: Prisma.ApplicationWhereInput = query.organisationId
      ? { organisationId: query.organisationId }
      : {};

    const [stages, total] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['stage'],
        where: appWhere,
        _count: { id: true },
      }),
      this.prisma.application.count({ where: appWhere }),
    ]);

    return {
      total,
      byStage: stages.map((s) => ({ stage: s.stage, count: s._count.id })),
    };
  }

  /**
   * CSV Export: Generates RFC 4180 compliant CSV stream without sensitive credentials
   */
  async exportCsv(query: QueryReportDto): Promise<string> {
    const type = query.type || 'overview';

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (type === 'organisations') {
      const orgs = await this.prisma.organisation.findMany({
        where: query.organisationId ? { id: query.organisationId } : {},
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
          status: true,
          tier: true,
          createdAt: true,
          _count: {
            select: {
              users: { where: { role: UserRole.RECRUITER } },
            },
          },
        },
      });

      const orgIds = orgs.map((o) => o.id);
      const [jobCounts, appCounts] = await Promise.all([
        this.prisma.job.groupBy({
          by: ['organisationId'],
          where: { organisationId: { in: orgIds } },
          _count: { id: true },
        }),
        this.prisma.application.groupBy({
          by: ['organisationId'],
          where: { organisationId: { in: orgIds } },
          _count: { id: true },
        }),
      ]);

      const jMap = new Map(jobCounts.map((j) => [j.organisationId, j._count.id]));
      const aMap = new Map(appCounts.map((a) => [a.organisationId, a._count.id]));

      const header = ['Organisation ID', 'Name', 'Slug', 'Contact Email', 'Status', 'Tier', 'Recruiters', 'Jobs', 'Applications', 'Created At'];
      const rows = orgs.map((o) => [
        escapeCsv(o.id),
        escapeCsv(o.name),
        escapeCsv(o.slug),
        escapeCsv(o.contactEmail),
        escapeCsv(o.status),
        escapeCsv(o.tier),
        escapeCsv(o._count.users),
        escapeCsv(jMap.get(o.id) || 0),
        escapeCsv(aMap.get(o.id) || 0),
        escapeCsv(o.createdAt.toISOString()),
      ]);

      return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    if (type === 'jobs') {
      const jobs = await this.prisma.job.findMany({
        where: query.organisationId ? { organisationId: query.organisationId } : {},
        take: 500,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          organisationId: true,
          status: true,
          workMode: true,
          employmentType: true,
          openings: true,
          createdAt: true,
          _count: { select: { applications: true } },
        },
      });

      const header = ['Job ID', 'Title', 'Organisation ID', 'Status', 'Work Mode', 'Employment Type', 'Openings', 'Applications', 'Created At'];
      const rows = jobs.map((j) => [
        escapeCsv(j.id),
        escapeCsv(j.title),
        escapeCsv(j.organisationId),
        escapeCsv(j.status),
        escapeCsv(j.workMode),
        escapeCsv(j.employmentType),
        escapeCsv(j.openings),
        escapeCsv(j._count.applications),
        escapeCsv(j.createdAt.toISOString()),
      ]);

      return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    // Default overview export
    const overview = await this.getOverview(query);
    const header = ['Category', 'Metric', 'Value'];
    const rows = [
      ['Organisations', 'Total Organisations', overview.organisations.total],
      ['Organisations', 'Active Organisations', overview.organisations.active],
      ['Organisations', 'Suspended Organisations', overview.organisations.suspended],
      ['Organisations', 'New In Period', overview.organisations.createdInPeriod],
      ['Users', 'Total Users', overview.users.total],
      ['Users', 'Active Users', overview.users.active],
      ['Recruiters', 'Total Recruiters', overview.recruiters.total],
      ['Recruiters', 'Active Recruiters', overview.recruiters.active],
      ['Jobs', 'Total Jobs', overview.jobs.total],
      ['Jobs', 'Active Published Jobs', overview.jobs.active],
      ['Jobs', 'Draft Jobs', overview.jobs.draft],
      ['Jobs', 'Jobs In Period', overview.jobs.createdInPeriod],
      ['Applications', 'Total Applications', overview.applications.total],
      ['Applications', 'Applications In Period', overview.applications.appliedInPeriod],
    ];

    return [header.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
  }
}
