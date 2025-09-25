import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module'; // 👈 NHỚ import
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.ACCESS_SECRET_KEY, // Hoặc lấy từ ConfigService
      signOptions: { expiresIn: '7d' }, // Cấu hình cho JWT
    }),
    ConfigModule,
  ], // 👈 THÊM VÀO ĐÂY
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
