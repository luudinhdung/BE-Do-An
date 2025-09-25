import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MailModule } from './mail/mail.module';
import { MessageModule } from './message/message.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // <-- quan trọng!
      envFilePath: '.env',
    }),
    MailModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    MessageModule,
    ChatModule,
    FeedbackModule,
    // các module khác...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
