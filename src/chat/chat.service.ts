import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { Room } from './room.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
  ) {}

  async createDirectRoom(user1: User, user2: User): Promise<Room> {
    const room = this.roomRepo.create({
      isGroup: false,
      members: [user1, user2],
    });
    return this.roomRepo.save(room);
  }

  async createGroupRoom(name: string, members: User[]): Promise<Room> {
    const room = this.roomRepo.create({
      name,
      isGroup: true,
      members,
    });
    return this.roomRepo.save(room);
  }

  async getRoomsForUser(userId: string): Promise<Room[]> {
    return this.roomRepo
      .createQueryBuilder('room')
      .innerJoin('room.members', 'member')
      .where('member.id = :userId', { userId })
      .leftJoinAndSelect('room.members', 'members')
      .getMany();
  }

  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<Message> {
    const message = this.messageRepo.create({
      roomId,
      senderId,
      content,
      mediaUrl,
    });
    return this.messageRepo.save(message);
  }

  async getMessages(roomId: string, limit = 50): Promise<Message[]> {
    return this.messageRepo.find({
      where: { roomId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markAsRead(roomId: string, userId: string): Promise<void> {
    await this.messageRepo.update(
      { roomId, isRead: false },
      { isRead: true },
    );
  }
}