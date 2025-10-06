import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  // Nạp tiền
  async deposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const tx = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: TransactionType.DEPOSIT,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      return transaction;
    });

    return tx;
  }

  // Lấy lịch sử
  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Lấy số dư
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  // Trừ tiền khi user gửi tin
  async chargeForMessage(userId: string, messageType: string, messageId?: string) {
    if (!messageType) {
      throw new BadRequestException('Missing message type');
    }

    const mt = messageType.toUpperCase();
    const validTypes = ['TEXT', 'IMAGE', 'FILE'];
    if (!validTypes.includes(mt)) {
      throw new BadRequestException(`Invalid message type: ${messageType}`);
    }

    // Nếu pricingRule.type không là unique, dùng findFirst để an toàn
    const rule = await this.prisma.pricingRule.findFirst({
      where: { type: mt as MessageType },
    });

    if (!rule || !rule.isActive) {
      throw new BadRequestException(`Pricing rule not found or inactive for type: ${mt}`);
    }

    const cost = rule.cost;

    // Kiểm tra user & số dư
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.balance < cost) {
      throw new BadRequestException('Insufficient balance');
    }

    // Thực hiện transaction
    const tx = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: -cost,
          type: TransactionType.MESSAGE,
          messageId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: cost } },
      });

      return transaction;
    });

    return tx;
  }
}
