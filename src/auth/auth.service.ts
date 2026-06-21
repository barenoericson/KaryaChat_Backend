import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
    username: string,
    role: UserRole.TEACHER | UserRole.STUDENT,
  ) {
    const user = await this.usersService.create(email, password, username, role);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Registration successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async verifyEmail(token: string) {
    const success = await this.usersService.verifyEmail(token);
    if (!success) throw new BadRequestException('Invalid or expired token');
    return { message: 'Email verified successfully!' };
  }
}
