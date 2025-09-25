// src/message/message.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';

@Module({
  imports: [PrismaModule],
  providers: [MessageService, MessageGateway],
  controllers: [MessageController],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}
