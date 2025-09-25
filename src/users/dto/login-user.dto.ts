import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email hoặc số điện thoại là bắt buộc' })
  @IsString()
  identifier: string;   // gom email/phone chung vào đây

  @IsNotEmpty({ message: 'Mật khẩu là bắt buộc' })
  @IsString()
  password: string;
}
