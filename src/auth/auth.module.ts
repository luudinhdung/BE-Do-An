import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.register({
      secret: 'your-secret-key', // Thay 'your-secret-key' bằng khóa bí mật của bạn
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    UsersModule
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule {}
