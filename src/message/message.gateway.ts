// message.gateway.ts - Sửa toàn bộ file
import { forwardRef, Inject } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageService } from './message.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/messages',
})
export class MessageGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    client: Socket,
    @MessageBody() payload: CreateMessageDto,
  ) {
    const message = await this.messageService.createWithSender(payload);
    console.log('Message sent:', message);

    // ✅ Emit tin nhắn mới
    this.server.to(payload.chatId).emit('receive_message', {
      ...message,
      messageId: message.id,
    });
    

    // ✅ Cập nhật unread counts cho tất cả participants
    const unreadCounts = await this.messageService.updateUnreadCountsForChat(
      payload.chatId,
      payload.senderId,
    );

    // ✅ Gửi unread count cho từng user
    unreadCounts.forEach(({ userId, count }) => {
      this.server.to(userId).emit('chat:unread', {
        chatId: payload.chatId,
        unreadCount: count,
      });
    });
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    client: Socket,
    @MessageBody()
    payload: { messageId: string; userId: string; chatId: string },
  ) {
    const { messageId, userId, chatId } = payload;

    // ✅ Lưu trạng thái đã đọc
    await this.messageService.markAsRead(messageId, userId);

    // ✅ Tính lại số chưa đọc
    const unreadCount = await this.messageService.getUnreadCount(
      chatId,
      userId,
    );

    // ✅ Emit về cho user này
    this.server.to(userId).emit('chat:unread', { chatId, unreadCount });

    // ✅ Broadcast cho cả phòng biết user này đã đọc
    this.server.to(chatId).emit('message:read', { messageId, userId });
  }

  @SubscribeMessage('message:read:chat')
  async handleMarkChatAsRead(
    client: Socket,
    @MessageBody() payload: { chatId: string; userId: string },
  ) {
    const { chatId, userId } = payload;

    // ✅ Đánh dấu tất cả tin nhắn trong chat là đã đọc
    const result = await this.messageService.markChatAsRead(chatId, userId);

    // ✅ Unread count sẽ là 0
    this.server.to(userId).emit('chat:unread', { chatId, unreadCount: 0 });

    // ✅ Broadcast cho cả room biết user này đã đọc hết
    this.server.to(chatId).emit('chat:all-read', { chatId, userId });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoomByChatId(client: Socket, chatId: string) {
    if (chatId) {
      client.join(chatId);
      console.log(`Client ${client.id} joined chat room ${chatId}`);
    }
  }

  @SubscribeMessage('chat:join')
  async handleChatJoin(
    client: Socket,
    @MessageBody() payload: { chatId: string; userId: string },
  ) {
    const { chatId, userId } = payload;

    // Join room chat
    client.join(chatId);

    // Gửi ngay unread count cho user khi họ join chat
    const unreadCount = await this.messageService.getUnreadCount(
      chatId,
      userId,
    );
    this.server.to(userId).emit('chat:unread', {
      chatId,
      unreadCount,
    });

    console.log(`User ${userId} joined chat ${chatId}`);
  }

  @SubscribeMessage('chat:update-time')
  handleChatUpdateTime(
    client: Socket,
    @MessageBody() payload: { chatId: string; updatedAt: string },
  ) {
    this.server.to(payload.chatId).emit('chat:update-time', payload);
  }

  @SubscribeMessage('user:join')
  handleJoinRoom(client: Socket, userId: string) {
    if (!userId) {
      return;
    }
    client.join(userId);
  }

  // ✅ Method để gửi unread counts khi user vào chat
  async sendUnreadCountsToUser(userId: string) {
    const unreadCounts = await this.messageService.getUnreadCounts(userId);

    Object.entries(unreadCounts).forEach(([chatId, count]) => {
      this.server.to(userId).emit('chat:unread', {
        chatId,
        unreadCount: count,
      });
    });
  }

  notifyAddUser(userId: string, payload: any) {
    console.log(`🔑 Notifying user ${userId} about new room key:`, payload);

    if (!userId) return;

    this.server.to(userId).emit('chat:new-room-key', payload);
  }

  deleteMessage(chatId: string, messageId: string) {
    console.log(`Deleting message ${messageId} in chat ${chatId}`);
    this.server.to(chatId).emit('message:deleted', {
      chatId,
      messageId,
    });
  }

  notifyChatDeleted(userId: string, chatId: string) {
    this.server.to(userId).emit('chat:deleted', { chatId });
  }

  notifyDeletedChat(chatId: string, userIds: string[]) {
    for (const userId of userIds) {
      this.server.to(userId).emit('chat:deleted', { chatId, userIds });
    }
  }
}
