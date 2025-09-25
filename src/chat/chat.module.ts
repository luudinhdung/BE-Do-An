import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MessageModule } from 'src/message/message.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ReactionService } from 'src/reactions/reaction.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.ACCESS_SECRET_KEY,
      signOptions: { expiresIn: '7d' },
    }),
    ConfigModule,
    MessageModule,
  ],
  providers: [ChatService, ChatGateway, ReactionService],
  controllers: [ChatController],
})
export class ChatModule {}
