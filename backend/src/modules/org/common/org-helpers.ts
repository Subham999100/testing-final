// ============================================================
// ORGANISATION PORTAL
// Small shared helpers: pagination, user lookups, scoping, CSV.
// ============================================================

import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, can } from './org-context';

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export function paging(q: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageResult<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

/** Resolves display names for a set of user ids, restricted to the caller's organisation. */
export async function userSummaries(
  prisma: PrismaService,
  organisationId: string,
  ids: (string | null | undefined)[],
): Promise<Map<string, UserSummary>> {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique }, organisationId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  return new Map(users.map((u) => [u.id, { id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), email: u.email }]));
}

/** Jobs visible to the caller: all org jobs, or own + assigned. */
export function jobScope(ctx: OrgContext): Prisma.JobWhereInput {
  if (can(ctx, 'jobs.read.all')) return { organisationId: ctx.organisationId };
  return {
    organisationId: ctx.organisationId,
    OR: [{ createdById: ctx.userId }, { assignments: { some: { userId: ctx.userId } } }],
  };
}

/** Applications visible to the caller: all org applications, or those on visible jobs / assigned to them. */
export function applicationScope(ctx: OrgContext): Prisma.ApplicationWhereInput {
  if (can(ctx, 'applications.read.all')) return { organisationId: ctx.organisationId };
  return {
    organisationId: ctx.organisationId,
    OR: [
      { assignedToId: ctx.userId },
      { job: { OR: [{ createdById: ctx.userId }, { assignments: { some: { userId: ctx.userId } } }] } },
    ],
  };
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join('; ') : String(v);
    // Neutralise spreadsheet formula injection and quote every cell.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

export function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const f = from ? new Date(from) : undefined;
  const t = to ? new Date(to) : undefined;
  const valid = (d?: Date) => d && !Number.isNaN(d.getTime());
  if (!valid(f) && !valid(t)) return undefined;
  return { ...(valid(f) ? { gte: f } : {}), ...(valid(t) ? { lte: t } : {}) };
}
