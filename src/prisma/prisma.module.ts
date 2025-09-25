import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 👈 CHỖ NÀY QUAN TRỌNG
})
export class PrismaModule {}
