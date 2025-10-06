import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 1000, description: 'Số tiền muốn nạp' })
  @IsInt({ message: 'Số tiền phải là số nguyên' })
  @Min(1, { message: 'Số tiền phải lớn hơn 0' })
  amount: number;
}
