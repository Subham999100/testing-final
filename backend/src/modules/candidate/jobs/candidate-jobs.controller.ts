// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Job Discovery Endpoints
// Base Route: /api/v1/candidate/jobs
// ============================================================

import { Controller, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CandidateJobQueryDto } from './candidate-jobs.dto';
import { CandidateJobsService } from './candidate-jobs.service';

@ApiTags('Candidate ? Jobs')
@Controller('candidate/jobs')
export class CandidateJobsController {
  constructor(private readonly jobsService: CandidateJobsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Query() q: CandidateJobQueryDto) {
    return this.jobsService.list(q);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id') id: string) {
    return this.jobsService.get(id);
  }
}