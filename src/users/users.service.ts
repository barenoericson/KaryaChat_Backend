import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    email: string,
    password: string,
    username: string,
    role: UserRole = UserRole.STUDENT,
  ): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2);

    const user = this.usersRepository.create({
      email,
      password: hashed,
      username,
      role,
      emailVerificationToken: verificationToken,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) return false;

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await this.usersRepository.save(user);
    return true;
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.usersRepository.update(id, { isOnline });
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :query', { query: `%${query}%` })
      .andWhere('user.id != :currentUserId', { currentUserId })
      .take(10)
      .getMany();
  }

  async updateProfile(
    id: string,
    data: { username?: string; bio?: string; avatar?: string },
  ): Promise<User> {
    await this.usersRepository.update(id, data);
    const updated = await this.findById(id);
    return updated!;
  }
}