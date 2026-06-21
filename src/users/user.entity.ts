import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  username: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true, type: 'varchar' })
  emailVerificationToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}