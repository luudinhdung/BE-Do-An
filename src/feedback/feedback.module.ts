import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackGateway } from './feedback.gateway';

@Module({
  imports: [PrismaModule],
  providers: [FeedbackService, FeedbackGateway],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
