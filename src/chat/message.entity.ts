import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from '../users/user.entity';
  
  @Entity('messages')
  export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column('text')
    content: string;
  
    @Column({ nullable: true })
    mediaUrl: string;
  
    @Column()
    roomId: string;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'senderId' })
    sender: User;
  
    @Column()
    senderId: string;
  
    @Column({ default: false })
    isRead: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  }