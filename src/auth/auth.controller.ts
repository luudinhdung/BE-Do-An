import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from 'src/users/dto/register-user.dto';
import { LoginDto } from 'src/users/dto/login-user.dto';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard) // Bước 1: Redirect người dùng đến Google OAuth
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard) // Bước 2: Xử lý callback từ Google sau khi người dùng đăng nhập
  googleAuthRedirect(@Req() req, @Res() res: Response) {
    // Sau khi xác thực thành công từ Google, chúng ta sẽ trả về thông tin người dùng và chuyển hướng.
    return res.redirect('http://localhost/:3000/dashboard'); // Địa chỉ muốn chuyển hướng sau khi đăng nhập thành công
  }
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(dto);

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', result.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return {
    message: 'Đăng nhập thành công',
    user: result.user,
    accessToken: result.accessToken,
  };
}
  

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    console.log('Sending OTP to email:', dto.email);
    return this.authService.sendOtp(dto.email);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.otp);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }
}
