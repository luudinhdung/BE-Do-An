import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AddUserToGroupDto } from './dto/AddUserToGroupDto';
import { CreateOneToOneChatDto } from './dto/create-one-to-one.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,   // ✅ inject vào constructor
  ) {}

  @Post('one-to-one')
  createOneToOneChat(@Body() body: CreateOneToOneChatDto, @Req() req) {
    const { userA, chatName, key } = body;
    return this.chatService.createOneToOneChat(userA, chatName, key, req);
  }

  @Get('check-one-to-one/:targetUserId')
  async checkOneToOneChat(
    @Req() req,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.chatService.findOneToOneChatWithUser(req, targetUserId);
  }

  @Post('create/group')
  async createGroupChat(
    @Body() body: { name: string; userIds: string[]; key: string },
    @Req() req,
  ) {
    return this.chatService.createGroupChat(
      body.name,
      body.userIds,
      body.key,
      req,
    );
  }

  @Get('my-groups')
  getMyGroupChats(@Req() req) {
    return this.chatService.getMyGroupChats(req);
  }

  @Delete('delete/:chatId')
  async deleteChat(@Param('chatId') chatId: string, @Req() req) {
    return this.chatService.deleteChat(chatId, req);
  }

  @Patch('group/:chatId/add-user')
  async addUserToGroup(
    @Param('chatId') chatId: string,
    @Body() body: AddUserToGroupDto,
    @Req() req: Request,
  ) {
    return this.chatService.addUserToGroup(chatId, body.userId, req);
  }

  // // GET defaultCountdown cho 1 chat
  // @Get(':id/countdown')
  // async getCountdown(@Param('id') chatId: string) {
  //   const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
  //   return { defaultCountdown: chat?.defaultCountdown ?? 30 };
  // }

  // @Patch(':id/countdown')
  // async updateCountdown(
  //   @Param('id') chatId: string,
  //   @Body() body: { countdown: number },
  // ) {
  //   const updated = await this.prisma.chat.update({
  //     where: { id: chatId },
  //     data: { defaultCountdown: body.countdown },
  //   });
  //   return { defaultCountdown: updated.defaultCountdown };
  // }
}
