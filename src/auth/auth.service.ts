import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto } from 'src/users/dto/login-user.dto';
import { RegisterDto } from 'src/users/dto/register-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
  ); // Thay bằng client ID của bạn
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private userService: UsersService,
  ) {}

  async generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, phone: user.phone };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  

  async sendOtp(email: string) {
    console.log('Đang gửi OTP qua gmail:', email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException('Không tìm thấy người dùng với email này');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpires: expires },
    });

    await this.mailService.sendMail({
      to: email,
      subject: 'OTP từ chat app',
      text: `OTP của bạn là ${otp}. Nó sẽ hết hiệu lực sau 5 phút.`,
    });

    return { message: 'Đã gửi OTP qua email' };
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Cần nhập email hoặc số điện thoại');
    }

    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email ?? undefined },
          { phone: dto.phone ?? undefined },
        ],
      },
    });

    if (exists) {
      throw new BadRequestException('Email hoặc số điện thoại đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const avatar = this.userService.generateRandomAvatar();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        password: hashedPassword,
        name: dto.name,
        avatar,
      },
    });

    return this.generateToken(user);
  }

  // auth.service.ts
async login(data: LoginDto) {
  const user = await this.prisma.user.findFirst({
    where: {
      OR: [{ email: data.identifier }, { phone: data.identifier }],
      isDeleted: false,
    },
  });

  if (!user) {
    console.log('User not found for identifier:', data.identifier);
    throw new HttpException(
      { message: 'User not found', code: 'USER_NOT_FOUND' },
      HttpStatus.UNAUTHORIZED,
    );
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    console.log('Sai mật khẩu for user:', user.id);
    throw new HttpException(
      { message: 'Invalid password', code: 'INVALID_PASSWORD' },
      HttpStatus.UNAUTHORIZED,
    );
  }

  const payload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = await this.jwtService.signAsync(payload, {
    secret: this.configService.get<string>('ACCESS_SECRET_KEY')!,
    expiresIn:
      this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') || '7d',
  });

  const refreshToken = await this.jwtService.signAsync({ sub: user.id }, {
    secret: this.configService.get<string>('REFRESH_SECRET_KEY')!,
    expiresIn:
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '30d',
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

async currentUser(token: string) {
  try {
    const decoded: any = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
    });

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };
  } catch (err) {
    throw new UnauthorizedException('Invalid token');
  }
}

  

  async verifyOtp(otp: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        otpCode: otp,
        otpExpires: { gte: new Date() },
      },
    });

    if (!user)
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');

    return { message: 'OTP hợp lệ' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        otpCode: otp,
        otpExpires: { gte: new Date() },
      },
    });
    console.log('User found:', user);

    if (!user)
      throw new BadRequestException('OTP không còn hiệu lực hoặc không hợp lệ');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        otpCode: null,
        otpExpires: null,
      },
    });

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  verifyToken(
    token: string,
  ): { id: string; email: string; name: string } | null {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
      };
    } catch (err) {
      console.error('Token không hợp lệ:', err.message);
      return null;
    }
  }

  async googleLogin(token: string) {
    try {
      // Xác minh ID Token từ Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload(); // Lấy payload từ Google
      if (!payload) {
        throw new Error('Unable to parse Google token payload');
      }

      const email = payload.email ?? ''; // Sử dụng toán tử ?? để cung cấp giá trị mặc định nếu email là undefined
      const { sub, picture } = payload;

      // Kiểm tra xem name có tồn tại trong payload không
      const name = payload.name || 'Unknown'; // Nếu không có name thì gán mặc định là 'Unknown'

      // Kiểm tra người dùng trong database
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Tạo JWT token cho người dùng
      if (user) {
        const payloadJWT = { sub: user.id };
        const accessToken = this.jwtService.sign(payloadJWT, {
          secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
          expiresIn: '7d',
        });

        return { access_token: accessToken };
      }
    } catch (error) {
      throw new Error('Google login failed: ' + error.message);
    }
  }
}
