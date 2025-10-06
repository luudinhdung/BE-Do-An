import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min } from 'class-validator';

export class UpdatePricingRuleDto {
  @ApiProperty({ example: 1, description: 'Chi phí áp dụng cho loại message' })
  @IsInt({ message: 'Cost phải là số nguyên' })
  @Min(0, { message: 'Cost phải >= 0' })
  cost: number;

  @ApiProperty({ example: true, description: 'Có đang áp dụng rule hay không' })
  @IsBoolean({ message: 'isActive phải là true/false' })
  isActive: boolean;
}
