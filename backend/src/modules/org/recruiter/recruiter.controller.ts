import { RecruiterOutreachService } from "./outreach.service";
import { Response } from "express";
import { RecruiterReportsService } from "./reports.service";
import { RecentSearchDto, ReportQueryDto } from "./workspace.dto";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import {
  Org,
  OrgContext,
  OrgGuard,
  OrgPerms,
  assertCan,
} from "../common/org-context";
import {
  FolderCandidatesDto,
  FolderDto,
  ProfessionalProfileDto,
  SavedSearchDto,
  TalentQueryDto,
  SelectionRangeDto,
  EmailDraftDto,
  WhatsAppPreviewDto,
  WhatsAppDispatchDto,
  SmsPreviewDto,
  SmsDispatchDto,
} from "./dto";
import { RecruiterService } from "./recruiter.service";
class SimilarQueryDto {
  @IsOptional() @IsUUID() jobId?: string;
  @IsOptional() @IsIn(["skills", "viewed"]) mode?: string;
}
@ApiTags("Org · Recruiter workspace")
@ApiBearerAuth()
@Controller("org/recruiter")
@UseGuards(JwtAuthGuard, OrgGuard)
export class RecruiterController {
  constructor(
    private readonly service: RecruiterService,
    private readonly reports: RecruiterReportsService,
    private readonly outreach: RecruiterOutreachService,
  ) {}
  @Get("recent-searches")
  @OrgPerms("candidates.search")
  recent(@Org() ctx: OrgContext) {
    return this.service.recentSearches(ctx);
  }
  @Post("recent-searches")
  @OrgPerms("candidates.search")
  record(@Org() ctx: OrgContext, @Body() dto: RecentSearchDto) {
    return this.service.recordSearch(ctx, dto);
  }
  @Get("reports")
  @OrgPerms("analytics.self", "analytics.recruiter", "analytics.org")
  report(@Org() ctx: OrgContext, @Query() q: ReportQueryDto) {
    return this.reports.run(ctx, q);
  }
  @Get("reports/export")
  @OrgPerms("exports.run", "reports.export.self")
  async exportReport(
    @Org() ctx: OrgContext,
    @Query() q: ReportQueryDto,
    @Res() res: Response,
  ) {
    const content = await this.reports.export(ctx, q);
    const format = q.format || "csv";
    const mime =
      format === "pdf"
        ? "application/pdf"
        : format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv";
    res
      .type(mime)
      .attachment(`recruiter-${q.type}-report.${format}`)
      .send(content);
  }
  @Get("candidates")
  @OrgPerms("candidates.search", "candidates.read")
  search(@Org() ctx: OrgContext, @Query() q: TalentQueryDto) {
    return this.service.search(ctx, q);
  }
  @Post("selection")
  @OrgPerms("candidates.search")
  select(@Org() ctx: OrgContext, @Body() dto: SelectionRangeDto) {
    return this.service.selectRange(ctx, dto);
  }
  @Post("email/preview")
  @OrgPerms("messages.use")
  previewEmail(@Org() ctx: OrgContext, @Body() dto: EmailDraftDto) {
    return this.outreach.preview(ctx, dto);
  }
  @Get("email/:id")
  @OrgPerms("messages.use")
  emailStatus(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.outreach.status(ctx, id);
  }
  @Post("email/:id/send")
  @OrgPerms("messages.use")
  emailSend(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.outreach.dispatch(ctx, id);
  }
  @Post("whatsapp/preview")
  @OrgPerms("messages.use")
  previewWhatsApp(@Org() ctx: OrgContext, @Body() dto: WhatsAppPreviewDto) {
    return this.outreach.whatsappPreview(ctx, dto);
  }
  @Post("whatsapp/send")
  @OrgPerms("messages.use")
  sendWhatsApp(@Org() ctx: OrgContext, @Body() dto: WhatsAppDispatchDto) {
    return this.outreach.whatsappSend(ctx, dto);
  }
  @Post("sms/preview")
  @OrgPerms("messages.use")
  previewSms(@Org() ctx: OrgContext, @Body() dto: SmsPreviewDto) {
    return this.outreach.smsPreview(ctx, dto);
  }
  @Post("sms/send")
  @OrgPerms("messages.use")
  sendSms(@Org() ctx: OrgContext, @Body() dto: SmsDispatchDto) {
    return this.outreach.smsSend(ctx, dto);
  }
  @Get("candidates/:id")
  @OrgPerms("candidates.read")
  detail(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.service.detail(ctx, id);
  }
  @Patch("candidates/:id/profile")
  @OrgPerms("candidates.save")
  update(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Body() dto: ProfessionalProfileDto,
  ) {
    return this.service.updateProfile(ctx, id, dto);
  }
  @Post("candidates/:id/viewed")
  @OrgPerms("candidates.read")
  viewed(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.service.viewed(ctx, id);
  }
  @Get("candidates/:id/resume/download")
  @OrgPerms("candidates.resume.view")
  downloadResume(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.service.downloadResume(ctx, id, res);
  }
  @Get("candidates/:id/similar")
  @OrgPerms("candidates.read")
  similar(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Query() q: SimilarQueryDto,
  ) {
    return this.service.similar(ctx, id, q.jobId, q.mode);
  }
  @Post("candidates/:id/ai-similar")
  @OrgPerms("ai.use")
  aiSimilar(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Body() q: SimilarQueryDto,
  ) {
    assertCan(ctx, "candidates.read");
    return this.service.aiSimilar(ctx, id, q.jobId);
  }
  @Get("folders")
  @OrgPerms("candidates.save")
  folders(@Org() ctx: OrgContext) {
    return this.service.folders(ctx);
  }
  @Post("folders")
  @OrgPerms("candidates.save")
  createFolder(@Org() ctx: OrgContext, @Body() dto: FolderDto) {
    return this.service.createFolder(ctx, dto);
  }
  @Delete("folders/:id")
  @OrgPerms("candidates.save")
  deleteFolder(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.service.deleteFolder(ctx, id);
  }
  @Post("folders/:id/candidates")
  @OrgPerms("candidates.save")
  add(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Body() dto: FolderCandidatesDto,
  ) {
    return this.service.folderCandidates(ctx, id, dto);
  }
  @Post("folders/:id/remove")
  @OrgPerms("candidates.save")
  remove(
    @Org() ctx: OrgContext,
    @Param("id") id: string,
    @Body() dto: FolderCandidatesDto,
  ) {
    return this.service.folderCandidates(ctx, id, dto, true);
  }
  @Get("searches")
  @OrgPerms("candidates.search")
  searches(@Org() ctx: OrgContext) {
    return this.service.savedSearches(ctx);
  }
  @Post("searches")
  @OrgPerms("candidates.search")
  saveSearch(@Org() ctx: OrgContext, @Body() dto: SavedSearchDto) {
    return this.service.saveSearch(ctx, dto);
  }
  @Delete("searches/:id")
  @OrgPerms("candidates.search")
  deleteSearch(@Org() ctx: OrgContext, @Param("id") id: string) {
    return this.service.deleteSearch(ctx, id);
  }
}

