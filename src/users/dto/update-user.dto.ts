import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  updateAt?: string;

  @IsOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3000)
  defaultCountdown?: number; 
}
