import {
  Controller, Get, Patch, Post, Param, UseGuards, Query, Body,
  UseInterceptors, UploadedFile,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './user.entity';
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

const avatarStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

function imageFileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) {
    return cb(new BadRequestException('Only image files are allowed'), false);
  }
  cb(null, true);
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  searchUsers(@Query('q') query: string, @CurrentUser() user: User) {
    return this.usersService.searchUsers(query, user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: User) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('profile/:id')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const avatarPath = `/uploads/avatars/${file.filename}`;
    const updated = await this.usersService.updateProfile(user.id, { avatar: avatarPath });
    return { avatar: avatarPath, user: updated };
  }
}
