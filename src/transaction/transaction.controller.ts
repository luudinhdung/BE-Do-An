import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { DepositDto } from './dto/deposit.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @ApiOperation({ summary: 'Xem lịch sử giao dịch của user' })
  @Get(':userId')
  async getUserTransactions(@Param('userId') userId: string) {
    return this.transactionService.getUserTransactions(userId);
  }

  @ApiOperation({ summary: 'Nạp tiền vào tài khoản user' })
  @Post(':userId/deposit')
  async deposit(@Param('userId') userId: string, @Body() dto: DepositDto) {
    return this.transactionService.deposit(userId, dto.amount);
  }

  @ApiOperation({ summary: 'Lấy số dư hiện tại của user' })
  @Get(':userId/balance')
  async getBalance(@Param('userId') userId: string) {
    const user = await this.transactionService.getBalance(userId);
    return { userId, balance: user.balance };
  }

  @ApiOperation({
    summary: 'Trừ tiền khi user gửi tin nhắn (TEXT, IMAGE, FILE)',
  })
  @Post(':userId/charge/:type')
  async chargeForMessage(
    @Param('userId') userId: string,
    @Param('type') type: string,
  ) {
    if (!['TEXT', 'IMAGE', 'FILE'].includes(type.toUpperCase())) {
      throw new BadRequestException('Invalid message type');
    }
    return this.transactionService.chargeForMessage(userId, type.toUpperCase());
  }
}
