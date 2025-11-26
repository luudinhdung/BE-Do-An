import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePassDto } from './dto/change-pass';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { generateAccessToken } from './tokens/generateAccessToken';
import { generateRefreshToken } from './tokens/generateRefreshToken';
import { LoginDto } from './dto/login-user.dto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1m'),
  analytics: true,
});
const listAvatar = [
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321053/16_etujwo.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321053/9_krit0t.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/12_jtbgzd.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321053/15_yxtvwx.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321053/14_clpfta.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321053/8_i9bmv7.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321052/4_qfi7xs.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/10_ulmvzj.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321052/6_z7dpvf.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321052/7_x7ndga.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321052/13_uljsuo.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/11_sgsdno.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/3_mb8wij.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/1_bv8kay.png',
  'https://res.cloudinary.com/dygi6b9cu/image/upload/v1753321051/2_rhh5hd.png',
];
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  generateRandomAvatar(): string {
    const index = Math.floor(Math.random() * listAvatar.length);
    return listAvatar[index];
  }

  async register(data: CreateUserDto) {
    if (!data.email && !data.phone) {
      throw new BadRequestException('Vui lòng nhập email hoặc số điện thoại');
    }

    const whereClause: any = {};

    if (data.email) {
      whereClause.email = data.email;
    }
    if (data.phone) {
      whereClause.phone = data.phone;
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          data.email ? { email: data.email } : null,
          data.phone ? { phone: data.phone } : null,
        ].filter((x): x is { email: string } | { phone: string } => x !== null),
      },
    });

    if (existingUser) {
      throw new BadRequestException('Email hoặc số điện thoại đã tồn tại');
    }

    

    const name =
      data.name || 'user_' + Math.random().toString(36).substring(2, 8);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Nếu không có avatar thì random
    const avatar =
      data.avatar && data.avatar.trim() !== ''
        ? data.avatar
        : this.generateRandomAvatar();

    const newUser = await this.prisma.user.create({
      data: {
        name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        password: hashedPassword,
        avatar,
        balance: 0, 
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        balance: true,
      },
    });

    return newUser;
  }

  async login(data: LoginDto, res: Response, req: Request) {
    console.log('Login attempt:', data);

    const ip = (req.headers['x-forwarded-for'] as string) || 'unknown';
    try {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return res.status(429).json({
          message: 'Số lần đăng nhập vượt quá giới hạn, hãy thử lại sau.',
        });
      }
    } catch (error) {
      console.error('Rate limit check failed:', error);
    }

    let user;
    if (data.identifier.includes('@')) {
      // Login bằng email
      user = await this.prisma.user.findUnique({
        where: { email: data.identifier },
      });
    } else {
      // Login bằng phone
      user = await this.prisma.user.findUnique({
        where: { phone: data.identifier },
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Sai mật khẩu' });
    }

    // Tạo JWT token
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Lưu token vào cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      message: 'Đăng nhập thành công',
      accessToken,
    });
  }
async getAllNonAdminUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          not: 'ADMIN',
        },
      },
    });
  }
  async updateUser(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Kiểm tra email
    if (data.email && data.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new BadRequestException('Email đã tồn tại');
      }
    }

    // Kiểm tra phone
    if (data.phone && data.phone !== user.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });
      if (phoneExists) {
        throw new BadRequestException('Số điện thoại đã tồn tại');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone, // 👈 thêm phone
        avatar: data.avatar,
        defaultCountdown: data.defaultCountdown,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true, // 👈 select ra luôn
        avatar: true,
        updatedAt: true,
        defaultCountdown: true,
      },
    });

    return updatedUser;
  }

  async currentUser(req, res) {
    const token = req.cookies['access_token'];
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });

      const userId = decoded.sub;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone, // 👈 thêm phone
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          defaultCountdown: user.defaultCountdown,
          balance: user.balance,
        },
        message: 'Current user retrieved successfully',
      });
    } catch (error) {
      console.error('Token verify error:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  async findAllUsers(req: Request) {
    const token = req.cookies['access_token'];
    if (!token) throw new UnauthorizedException('Token không tồn tại');

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });

      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true, // 👈 thêm phone
          avatar: true,
          role: true,
          createdAt: true,
          balance: true,
        },
      });

      return users;
    } catch (error) {
      console.error('JWT hoặc query lỗi:', error);
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  async findAll(req: Request) {
    const token = req.cookies['access_token'];
    if (!token) throw new UnauthorizedException('Token không tồn tại');

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });

      const userId = decoded.sub;

      const users = await this.prisma.user.findMany({
        where: {
          isDeleted: false,
          id: { not: userId },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true, // 👈 thêm phone
          avatar: true,
          createdAt: true,
        },
      });

      return users;
    } catch (error) {
      console.error('JWT hoặc query lỗi:', error);
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  async changePass(req: Request, data: ChangePassDto, res: Response) {
    try {
      const token = req.cookies['access_token'];
      if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy token' });
      }
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'), // Lấy ACCESS_SECRET_KEY từ config
      });
      const userId = decoded.sub;
      console.log(decoded);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng ' });
      }

      const isOldPasswordCorrect = await bcrypt.compare(
        data.oldPassword,
        user.password,
      );
      if (!isOldPasswordCorrect) {
        return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      return res
        .status(500)
        .json({ message: 'Có lỗi xảy ra', error: error.message });
    }
  }

  async deleteAccount(req: Request, res: Response) {
    const token = req.cookies['access_token'];
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy access token');
    }
    console.log('token', token);

    let decoded;
    try {
      decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    const userId = decoded.sub;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Cập nhật trạng thái là đã xoá
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Xoá cookie để logout
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return res
      .status(200)
      .json({ message: 'Tài khoản đã được xoá (vô hiệu hoá)' });
  }

  async searchUsersByEmail(email: string, req) {
    const token = req.cookies['access_token'];
    if (!token) throw new UnauthorizedException('Token không tồn tại');

    if (!email || email.trim() === '') {
      return [];
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
      });

      const userId = decoded.sub;

      return this.prisma.user.findMany({
        where: {
          AND: [
            {
              NOT: {
                id: userId, // loại bỏ user hiện tại
              },
            },
            {
              role: {
                not: 'ADMIN', // loại bỏ những user có role là ADMIN
              },
            },
            {
              OR: [
                {
                  email: {
                    contains: email,
                    mode: 'insensitive',
                  },
                },
                {
                  phone: {
                    contains: email,
                    mode: 'insensitive',
                  },
                },
                {
                  id: {
                    contains: email,
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true, // có thể bỏ nếu không muốn trả ra role
          balance: true,
        },
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  async logout(req: Request, res: Response) {
    // Xoá cookie access_token và refresh_token
    res.clearCookie('access_token', {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
});
res.clearCookie('refresh_token', {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
});

    return res.status(200).json({ message: 'Đăng xuất thành công' });
  }
}
