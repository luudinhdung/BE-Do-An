import {
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
  import { Server } from 'socket.io';
  
  @WebSocketGateway({ cors: {
    origin: '*', // hoặc frontend URL http://localhost:3000
  }, })
  
  export class FeedbackGateway {
    @WebSocketServer()
    server: Server;
  
    notifyNewFeedback(feedback: any) {
      this.server.emit('newFeedback', feedback);
    }
  }
  