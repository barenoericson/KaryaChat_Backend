import {
  Controller, Get, Patch,
  UseGuards, Request, Query, Body
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { IsString, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req) {
    const { password, emailVerificationToken, ...user } = req.user;
    return user;
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  searchUsers(@Query('q') query: string, @Request() req) {
    return this.usersService.searchUsers(query, req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
}