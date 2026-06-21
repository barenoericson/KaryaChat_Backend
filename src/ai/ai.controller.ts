import {
  Controller, Post, Body, UseGuards, Request,
} from '@nestjs/common';
import { IsString, IsArray, IsIn, ValidateNested, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

class HistoryItemDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

class ExecuteDto {
  @IsString()
  @IsNotEmpty()
  language!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

class ChatDto {
  @IsString()
  message!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryItemDto)
  @IsOptional()
  history: HistoryItemDto[] = [];
}

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  teacherChat(@Body() dto: ChatDto) {
    return this.aiService.chat('teacher', dto.history, dto.message);
  }

  @Post('student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  studentChat(@Body() dto: ChatDto) {
    return this.aiService.chat('student', dto.history, dto.message);
  }

  @Post('guest')
  guestChat(@Body() dto: ChatDto, @Request() req: any) {
    const ip: string =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    return this.aiService.chat('guest', dto.history, dto.message, ip);
  }

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  executeCode(@Body() dto: ExecuteDto) {
    return this.aiService.executeCode(dto.language, dto.code);
  }
}
