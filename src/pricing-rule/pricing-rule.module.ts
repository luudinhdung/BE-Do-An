import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingRuleController } from './pricing-rule.controller';
import { PricingRuleService } from './pricing-rule.service';

@Module({
  controllers: [PricingRuleController],
  providers: [PricingRuleService, PrismaService],
  exports: [PricingRuleService],
})
export class PricingRuleModule {}
