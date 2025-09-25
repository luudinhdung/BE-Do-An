import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MessageGateway } from 'src/message/message.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
    private readonly messageGateway: MessageGateway,
  ) {}
  async createOneToOneChat(
    userAId: string,
    chatName: string,
    key: string,
    req,
  ) {
    const serverKey = crypto.randomBytes(32);
    const serverKeyHex = serverKey.toString('hex');
    console.log('keyyyyyyyyyyyyyyyyyyyyyyyyyyyy', key);

    const token = req.cookies['access_token'];
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
    });
    console.log('decodeddddddddddddddddddd', decoded);

    const userId = decoded.sub;

    if (userId === userAId) {
      throw new BadRequestException('Không thể tạo chat với chính mình');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [userAId, userId] } },
    });

    if (users.length < 2) {
      throw new Error('Một hoặc cả hai người dùng không tồn tại');
    }

    const existingChat = await this.prisma.chat.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: { userId: userId },
        },
        AND: {
          participants: {
            some: { userId: userAId },
          },
        },
      },
      include: { participants: true },
    });

    if (existingChat && existingChat.participants.length === 2) {
      return {
        message: 'Đoạn chat đã tồn tại',
        chat: existingChat,
      };
    }

    const expiresAt = new Date(Date.now() + 45 * 60 * 1000);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    const newChat = await this.prisma.chat.create({
      data: {
        isGroup: false,
        name: '',
        durationTime: expiresAt,
        serverKey: serverKeyHex,
        hashedUserKey: key,
        participants: {
          create: [{ userId: userId }, { userId: userAId }],
        },
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    this.messageGateway.notifyAddUser(userAId, {
      chatId: newChat.id,
      fromUserId: userId,
      userCurrnt: user.name,
      encryptedKey: key,
      createdAt: newChat.createdAt,

      // 🧩 Thêm thông tin đầy đủ về phòng
      room: {
        id: newChat.id,
        isGroup: newChat.isGroup,
        name: newChat.name,
        durationTime: newChat.durationTime,
        participants: newChat.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: {
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
          },
        })),
        lastMessage: null,
        createdAt: newChat.createdAt,
      },
    });

    return {
      message: 'Tạo đoạn chat thành công',
      chat: newChat,
    };
  }

  async createGroupChat(name: string, userIds: string[], key: string, req) {
    const token = req.cookies['access_token'];
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
    });

    const creatorId = decoded.sub;

    const expiresAt = new Date(Date.now() + 45 * 60 * 1000);

    const allUserIds = Array.from(new Set([...userIds, creatorId]));

    if (allUserIds.length < 2) {
      throw new Error('Group chat phải có ít nhất 2 thành viên');
    }

    const foundUsers = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
    });

    if (foundUsers.length !== allUserIds.length) {
      throw new Error('Một hoặc nhiều user không tồn tại');
    }

    const newGroup = await this.prisma.chat.create({
      data: {
        isGroup: true,
        name,
        durationTime: expiresAt,
        hashedUserKey: key,
        participants: {
          create: allUserIds.map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const creator = foundUsers.find((u) => u.id === creatorId);
    if (!creator) {
      throw new NotFoundException(
        'Người tạo nhóm không tồn tại trong danh sách users',
      );
    }
    // 🟢 Gửi socket đến từng user (trừ người tạo)
    for (const user of foundUsers) {
      if (user.id !== creatorId) {
        this.messageGateway.notifyAddUser(user.id, {
          chatId: newGroup.id,
          fromUserId: creatorId,
          userCurrnt: creator.name,
          encryptedKey: key,
          createdAt: newGroup.createdAt,

          room: {
            id: newGroup.id,
            isGroup: newGroup.isGroup,
            name: newGroup.name,
            durationTime: newGroup.durationTime,
            participants: newGroup.participants.map((p) => ({
              id: p.id,
              userId: p.userId,
              user: {
                id: p.user.id,
                name: p.user.name,
                email: p.user.email,
              },
            })),
            lastMessage: null,
            createdAt: newGroup.createdAt,
          },
        });
      }
    }

    return {
      message: 'Tạo nhóm chat thành công',
      chat: newGroup,
    };
  }

  async findOneToOneChatWithUser(req, targetUserId: string) {
    const token = req.cookies['access_token'];
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
    });
    const userId = decoded.sub;

    const chat = await this.prisma.chat.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: { userId },
        },
        AND: {
          participants: {
            some: { userId: targetUserId },
          },
        },
      },
      include: { participants: true },
    });

    if (chat && chat.participants.length === 2) {
      return { exists: true, chat };
    } else {
      return { exists: false };
    }
  }

  async getMyGroupChats(req) {
    const token = req.cookies['access_token'];
    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>('ACCESS_SECRET_KEY'),
    });
    const userId = decoded.sub;

    // Lấy danh sách đoạn chat cùng tin nhắn mới nhất
    const groupChats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        },
      },
    });

    // Gắn thêm durationTime cho mỗi chat
    const chatsWithTime = groupChats.map((chat) => {
      const latestMessage = chat.messages[0];
      return {
        ...chat,
        durationTime: latestMessage?.createdAt ?? chat.createdAt,
      };
    });

    return chatsWithTime;
  }

  async addUserToGroup(chatId: string, userId: string, req: Request) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      throw new NotFoundException('Chat group không tồn tại');
    }

    if (!chat.isGroup) {
      throw new BadRequestException('Chỉ có thể thêm thành viên vào nhóm chat');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const alreadyInGroup = chat.participants.some((p) => p.userId === userId);
    if (alreadyInGroup) {
      throw new BadRequestException('Người dùng đã có trong nhóm');
    }

    const added = await this.prisma.chatParticipant.create({
      data: {
        chatId,
        userId,
      },
    });

    // Gửi thông báo socket cho người dùng vừa được thêm (nếu muốn)
    this.messageGateway.notifyAddUser(userId, {
      chatId,
      fromUserId: null,
      userCurrnt: 'Admin/Người thêm',
      encryptedKey: chat.hashedUserKey,
      createdAt: chat.createdAt,
      room: {
        id: chat.id,
        isGroup: chat.isGroup,
        name: chat.name,
        durationTime: chat.durationTime,
        participants: chat.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: {
            id: p.userId,
            name: '', // optional: load nếu cần
            email: '',
          },
        })),
        lastMessage: null,
        createdAt: chat.createdAt,
      },
    });

    return { message: 'Đã thêm người dùng vào nhóm chat', participant: added };
  }

  async deleteChat(chatId: string, user: any) {
    const currentUserId = user.id;

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { select: { userId: true } },
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const deleted = await this.prisma.chat.delete({ where: { id: chatId } });

    const otherUsers = chat.participants
      .filter((p) => p.userId !== currentUserId)
      .map((p) => p.userId);

    this.messageGateway.notifyDeletedChat(chatId, otherUsers); // gọi từ service
    return deleted;
  }
}
