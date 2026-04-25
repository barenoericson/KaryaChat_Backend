import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToMany,
    JoinTable,
  } from 'typeorm';
  import { User } from '../users/user.entity';
  
  @Entity('rooms')
  export class Room {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ nullable: true })
    name: string;
  
    @Column({ default: false })
    isGroup: boolean;
  
    @ManyToMany(() => User)
    @JoinTable()
    members: User[];
  
    @CreateDateColumn()
    createdAt: Date;
  }