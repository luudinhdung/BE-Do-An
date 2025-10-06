import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { PricingRuleService } from './pricing-rule.service';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Pricing Rules')
@Controller('pricing-rules')
export class PricingRuleController {
  constructor(private pricingRuleService: PricingRuleService) {}

  @ApiOperation({ summary: 'Lấy danh sách pricing rules' })
  @Get()
  async getAll() {
    return this.pricingRuleService.getAll();
  }

  @ApiOperation({ summary: 'Cập nhật pricing rule theo type (TEXT, IMAGE, FILE)' })
  @Put(':type')
  async update(
    @Param('type') type: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    return this.pricingRuleService.update(type, dto.cost, dto.isActive);
  }
}
