  // auth/dto/register.dto.ts
  import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Matches,
    MinLength,
  } from 'class-validator';

  export class RegisterDto {
    @IsNotEmpty({ message: 'Tên không được để trống' })
    name: string;

    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsOptional()
    email?: string;

    @IsOptional()
    @Matches(/^(0|\+84)\d{9}$/, { message: 'Số điện thoại không hợp lệ' })
    phone?: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
      message: 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
    })
    password: string;
  }
