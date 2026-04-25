import {
  Controller, Post, Body, UseGuards,
  Request, Get
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsArray()
  history: { role: 'user' | 'model'; content: string }[];
}

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('models')
  async listModels() {
    return this.aiService.listModels();
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatMessageDto, @Request() req) {
    const response = await this.aiService.chat(dto.history, dto.message);
    return {
      message: response,
      role: 'model',
    };
  }
}