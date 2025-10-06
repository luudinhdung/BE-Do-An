import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class PricingRuleService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    return this.prisma.pricingRule.findMany();
  }

  async update(type: string, cost: number, isActive: boolean) {
    // Ép kiểu string sang enum MessageType
    const typeEnum = type as MessageType;

    // Kiểm tra record tồn tại
    const existing = await this.prisma.pricingRule.findUnique({
      where: { type: typeEnum },
    });

    if (!existing) {
      throw new BadRequestException(`Pricing rule type "${type}" không tồn tại`);
    }

    return this.prisma.pricingRule.update({
      where: { type: typeEnum },
      data: { cost, isActive },
    });
  }
}
