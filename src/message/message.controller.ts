// src/message/message.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

@Controller('messages')
export class MessageController {
  prisma: any;
  constructor(private readonly messageService: MessageService) {}

  @Post()
  create(@Body() dto: CreateMessageDto) {
    return this.messageService.createWithSender(dto);
  }

  @Delete('delete')
  delete(@Body('messageId') messageId: string) {
    return this.messageService.delete(messageId);
  }

  @Get('chat/:chatId')
  findByChat(@Param('chatId') chatId: string) {
    return this.messageService.findByChat(chatId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('files', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          callback(null, file.originalname); // giữ nguyên tên gốc
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('Uploading file:', file);
    return this.messageService.uploadFile(file);
  }

  @Get(':id')
  async findMessageById(@Param('id') id: string) {
    const message = await this.messageService.findMessageById(id);

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    return message;
  }

  @Get('unread/:userId')
  async getUnreadCounts(@Param('userId') userId: string) {
    return this.messageService.getUnreadCounts(userId);
  }

  
}
