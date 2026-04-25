import { Controller, Get, Post, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
  ) {}

  @Get('rooms')
  getRooms(@Request() req) {
    return this.chatService.getRoomsForUser(req.user.id);
  }

  @Post('rooms/direct')
  async createDirectRoom(
    @Body() body: { userId: string },
    @Request() req,
  ) {
    const otherUser = await this.usersService.findById(body.userId);
    if (!otherUser) throw new NotFoundException('User not found');
    return this.chatService.createDirectRoom(req.user, otherUser);
  }

  @Post('rooms/group')
  async createGroupRoom(
    @Body() body: { name: string; memberIds: string[] },
    @Request() req,
  ) {
    const members = await Promise.all(
      body.memberIds.map(id => this.usersService.findById(id))
    );
    const validMembers = members.filter(m => m !== null);
    return this.chatService.createGroupRoom(body.name, [req.user, ...validMembers]);
  }

  @Get('rooms/:roomId/messages')
  getMessages(@Param('roomId') roomId: string) {
    return this.chatService.getMessages(roomId);
  }
}