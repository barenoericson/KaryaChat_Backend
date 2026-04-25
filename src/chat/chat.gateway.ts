import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      await this.usersService.updateOnlineStatus(user.id, true);

      // Join all user's rooms
      const rooms = await this.chatService.getRoomsForUser(user.id);
      rooms.forEach(room => client.join(room.id));

      this.server.emit('userOnline', { userId: user.id });
      console.log(`✅ Client connected: ${user.username}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      await this.usersService.updateOnlineStatus(user.id, false);
      this.server.emit('userOffline', { userId: user.id });
      console.log(`❌ Client disconnected: ${user.username}`);
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    const messages = await this.chatService.getMessages(data.roomId);
    client.emit('messageHistory', messages);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { roomId: string; content: string; mediaUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return;

    const message = await this.chatService.saveMessage(
      data.roomId,
      user.id,
      data.content,
      data.mediaUrl,
    );

    this.server.to(data.roomId).emit('newMessage', {
      ...message,
      sender: { id: user.id, username: user.username, avatar: user.avatar },
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    client.to(data.roomId).emit('userTyping', {
      userId: user.id,
      username: user.username,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    client.to(data.roomId).emit('userStoppedTyping', { userId: user.id });
  }
}