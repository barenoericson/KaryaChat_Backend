import {
  Controller, Post, Get, Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { QuizzesService } from './quizzes.service';
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmittedAnswerDto {
  @IsInt() questionIndex!: number;
  @IsString() answer!: string;
}

class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];
}

@Controller('classes/:classId/lessons/:lessonId/quiz')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('generate')
  @Roles(UserRole.TEACHER)
  generate(@Param('classId') classId: string, @Param('lessonId') lessonId: string, @Req() req: any) {
    return this.quizzesService.generate(req.user.id, classId, lessonId);
  }

  @Get()
  getQuiz(@Param('classId') classId: string, @Param('lessonId') lessonId: string, @Req() req: any) {
    return this.quizzesService.getQuiz(req.user.id, classId, lessonId);
  }

  @Post('submit')
  @Roles(UserRole.STUDENT)
  submit(
    @Param('classId') classId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: any,
  ) {
    return this.quizzesService.submitQuiz(req.user.id, classId, lessonId, dto.answers);
  }

  @Get('results')
  @Roles(UserRole.TEACHER)
  getResults(@Param('classId') classId: string, @Param('lessonId') lessonId: string, @Req() req: any) {
    return this.quizzesService.getResultsForLesson(req.user.id, classId, lessonId);
  }

  @Get('my-result')
  @Roles(UserRole.STUDENT)
  getMyResult(@Param('classId') classId: string, @Param('lessonId') lessonId: string, @Req() req: any) {
    return this.quizzesService.getMyResult(req.user.id, classId, lessonId);
  }
}
