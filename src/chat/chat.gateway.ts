import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ReactionService } from 'src/reactions/reaction.service';

@WebSocketGateway({ cors: true, namespace: '/messages' })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private reactionService: ReactionService) {}

  @SubscribeMessage('send_reaction')
  async handleSendReaction(
    @MessageBody()
    data: {
      chatId: string;
      messageId: string;
      userId: string;
      emoji: string;
    },
  ) {
    const updatedMessage = await this.reactionService.addReaction(
      data.userId,
      data.messageId,
      data.emoji,
    );

    this.server.to(data.chatId).emit('receive_reaction', updatedMessage);
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @MessageBody() data: { chatId: string; messageId: string; userId: string },
  ) {
    const updatedMessage = await this.reactionService.removeReaction(
      data.userId,
      data.messageId,
    );

    this.server.to(data.chatId).emit('remove_reaction', updatedMessage);
  }
}
