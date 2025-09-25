// src/message/dto/create-message.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, MessageStatus } from '@prisma/client';

export class EncryptedContent {
  @IsString()
  iv: string;

  @IsString()
  data: string;
}

export class CreateMessageDto {
  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @ValidateNested()
  @Type(() => EncryptedContent)
  content: EncryptedContent;

  @IsOptional()
  @IsUUID()
  repliedMessageId?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsBoolean()
  isEncrypted?: boolean; // Thêm trường này để đánh dấu tin nhắn có mã hóa hay không
  fileName: null;
  encryptedContent: any;

  @IsOptional()
  @IsString()
  previewUrl?: string;
}
