import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MessageGateway))
    private readonly messageGateway: MessageGateway,
  ) {}

  // ✅ Implement method markAsRead
  async markAsRead(messageId: string, userId: string) {
    // Kiểm tra xem đã đọc chưa
    const existingRead = await this.prisma.messageRead.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    // Nếu chưa đọc thì tạo mới
    if (!existingRead) {
      return this.prisma.messageRead.create({
        data: {
          messageId,
          userId,
        },
      });
    }

    return existingRead;
  }

  // ✅ Implement method markChatAsRead
  async markChatAsRead(chatId: string, userId: string) {
    // Lấy thời điểm user tham gia chat
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      select: { joinedAt: true },
    });

    if (!participant) return { count: 0 };

    // Lấy tất cả tin nhắn trong chat được gửi sau khi user tham gia
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        createdAt: { gte: participant.joinedAt },
        senderId: { not: userId }, // Chỉ lấy tin nhắn không phải của mình
      },
      select: { id: true },
    });

    // Tạo records cho tất cả tin nhắn chưa đọc
    const messageReads = messages.map((message) => ({
      messageId: message.id,
      userId,
    }));

    if (messageReads.length === 0) {
      return { count: 0 };
    }

    // Sử dụng transaction để xử lý atomic
    const result = await this.prisma.$transaction(async (tx) => {
      // Xóa các bản ghi cũ để tránh lỗi duplicate
      await tx.messageRead.deleteMany({
        where: {
          userId,
          messageId: { in: messages.map((m) => m.id) },
        },
      });

      // Tạo bản ghi mới
      await tx.messageRead.createMany({
        data: messageReads,
        skipDuplicates: true,
      });

      return { count: messageReads.length };
    });

    return result;
  }

  async createWithSender(dto: CreateMessageDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.senderId },
    });

    if (!user) throw new Error(`User with ID ${dto.senderId} not found`);

    await this.prisma.chat.upsert({
      where: { id: dto.chatId },
      create: { id: dto.chatId },
      update: {},
    });

    const messageData: any = {
      chatId: dto.chatId,
      senderId: dto.senderId,
      repliedMessageId: dto.repliedMessageId,
      type: dto.type,
      attachments: dto.attachments,
      status: dto.status,
      isEncrypted: dto.isEncrypted || false,
    };

    if (dto.isEncrypted) {
      if (!dto.content.iv || !dto.content.data) {
        throw new Error('Encrypted message requires iv and data fields');
      }
      messageData.content = JSON.stringify(dto.content);
      messageData.iv = dto.content.iv;
      messageData.data = dto.content.data;
    } else {
      messageData.content =
        typeof dto.content === 'object'
          ? JSON.stringify(dto.content)
          : dto.content;
    }

    const message = await this.prisma.message.create({
      data: messageData,
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    return {
      ...message,
      isEncrypted: dto.isEncrypted || false,
    };
  }

  async uploadFile(file: Express.Multer.File) {
    console.log(file, 'File uploaded successfully');
    const filePath = `http://localhost:3002/uploads/${file.originalname}`;
    return { filePath, originalName: file.originalname };
  }

  async findByChat(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        type: true,
        repliedMessageId: true,
        reactions: true,
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async delete(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { chatId: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    this.messageGateway.deleteMessage(message.chatId, messageId);

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  async findMessageById(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  // ✅ Cải thiện method getUnreadCount
  async getUnreadCount(chatId: string, userId: string) {
    // Lấy thời điểm user tham gia chat
    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      select: { joinedAt: true },
    });

    if (!participant) return 0;

    const totalMessages = await this.prisma.message.count({
      where: {
        chatId,
        createdAt: { gte: participant.joinedAt },
        senderId: { not: userId }, // ✅ Không đếm tin nhắn của chính mình
      },
    });

    const readMessages = await this.prisma.messageRead.count({
      where: {
        message: {
          chatId,
          createdAt: { gte: participant.joinedAt },
        },
        userId,
      },
    });

    return Math.max(0, totalMessages - readMessages);
  }

  // ✅ Cải thiện method getUnreadCounts
  async getUnreadCounts(userId: string) {
    // Lấy tất cả chat mà user đang tham gia
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          where: { userId },
          select: { joinedAt: true },
        },
        messages: {
          where: {
            senderId: { not: userId }, // ✅ Chỉ lấy tin nhắn không phải của mình
          },
          include: {
            messageReads: {
              where: { userId }, // ✅ Chỉ lấy trạng thái đọc của user này
            },
          },
        },
      },
    });

    const unreadCounts: Record<string, number> = {};

    chats.forEach((chat) => {
      const participant = chat.participants[0];
      if (!participant) {
        unreadCounts[chat.id] = 0;
        return;
      }

      // Chỉ đếm tin nhắn sau khi user tham gia
      const unread = chat.messages.filter(
        (msg) =>
          msg.messageReads.length === 0 && // ✅ Tin nhắn chưa đọc
          msg.createdAt >= participant.joinedAt, // ✅ Tin nhắn sau khi tham gia
      ).length;

      unreadCounts[chat.id] = unread;
    });

    return unreadCounts;
  }

  // ✅ Method mới để cập nhật unread count khi có tin nhắn mới
  async updateUnreadCountsForChat(chatId: string, senderId: string) {
    // Lấy tất cả participants trong chat (trừ người gửi)
    const participants = await this.prisma.chatParticipant.findMany({
      where: {
        chatId,
        userId: { not: senderId },
      },
    });

    // Tính toán unread count cho từng participant
    const unreadCounts: Array<{ userId: string; count: number }> = [];

    for (const participant of participants) {
      const count = await this.getUnreadCount(chatId, participant.userId);
      unreadCounts.push({ userId: participant.userId, count });
    }

    return unreadCounts;
  }
}
