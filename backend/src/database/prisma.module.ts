// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Prisma Global Database Module
// ============================================================

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
