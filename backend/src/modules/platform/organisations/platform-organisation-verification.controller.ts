// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Organisation Applications Review & Verification
// Base Route: /api/v1/platform/organisation-applications
//
// Security & Access Control:
// - Strictly protected by JwtAuthGuard, RolesGuard, and PermissionsGuard.
// - Requires UserRole.PLATFORM_SUPER_ADMIN or UserRole.PLATFORM_ADMIN.
// - Requires PlatformPermissions.ORGANISATIONS_READ for read operations.
// - Requires PlatformPermissions.ORGANISATIONS_UPDATE for review workflow actions.
// - Actor identity derived exclusively from the authenticated server-side session.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformOrganisationVerificationService } from './platform-organisation-verification.service';
import { QueryOrganisationApplicationsDto } from './dto/query-organisation-applications.dto';
import { RequestApplicationInfoDto } from './dto/request-application-info.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/organisation-applications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformOrganisationVerificationController {
  constructor(
    private readonly verificationService: PlatformOrganisationVerificationService,
  ) {}

  /**
   * GET /api/v1/platform/organisation-applications
   * Verification Queue - Paginated & filterable list of applications.
   */
  @Get()
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async findAll(@Query() query: QueryOrganisationApplicationsDto) {
    return this.verificationService.findAll(query);
  }

  /**
   * GET /api/v1/platform/organisation-applications/:id
   * Application Detail - Complete metadata, owner, plan, payment, review history, and document metadata.
   */
  @Get(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.verificationService.findOne(id);
  }

  /**
   * GET /api/v1/platform/organisation-applications/:applicationId/documents/:documentId
   * Secure Document Retrieval - Streams private file binary with safe headers.
   */
  @Get(':applicationId/documents/:documentId')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async retrieveDocument(
    @Param('applicationId', new ParseUUIDPipe({ version: '4' })) applicationId: string,
    @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
    @Res() res: Response,
  ) {
    const doc = await this.verificationService.retrieveDocument(applicationId, documentId);

    // Sanitize filename for Content-Disposition header
    const safeFilename = doc.fileName.replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', doc.contentType);
    res.setHeader('Content-Length', doc.contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.send(doc.buffer);
  }

  /**
   * POST /api/v1/platform/organisation-applications/:id/request-information
   * Requests additional information from applicant, moving status to MORE_INFO_REQUESTED.
   */
  @Post(':id/request-information')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  async requestInformation(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RequestApplicationInfoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.verificationService.requestInformation(id, dto, actor, ipAddress, userAgent);
  }

  /**
   * POST /api/v1/platform/organisation-applications/:id/reject
   * Rejects application with required reason, moving status to REJECTED.
   */
  @Post(':id/reject')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.verificationService.reject(id, dto, actor, ipAddress, userAgent);
  }

  /**
   * POST /api/v1/platform/organisation-applications/:id/approve
   * Milestone 5: Atomically approves the application and provisions the Organisation,
   * Metadata, Token Balance, Allocation Limits, Super Admin User, OrgMemberProfile,
   * links createdOrganisationId, and writes audit logs in a single transaction.
   */
  @Post(':id/approve')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.verificationService.approve(id, actor, ipAddress, userAgent);
  }
}
