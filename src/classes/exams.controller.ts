import {
  Controller, Post, Get, Patch, Body, Param, UseGuards, Req,
} from '@nestjs/common';
import {
  IsString, IsArray, IsNotEmpty, IsNumber, IsOptional,
  ValidateNested, IsEnum, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { QuizzesService } from './quizzes.service';

class QuizQuestionDto {
  @IsEnum(['mcq', 'fill', 'short', 'coding', 'open-ended', 'essay'])
  type!: 'mcq' | 'fill' | 'short' | 'coding' | 'open-ended' | 'essay';

  @IsString() @IsNotEmpty()
  question!: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  options?: string[];

  @IsString() @IsNotEmpty()
  answer!: string;

  @IsOptional() @IsNumber()
  maxScore?: number;

  @IsOptional() @IsString()
  explanation?: string;
}

class CreateExamDto {
  @IsString() @IsNotEmpty()
  title!: string;

  @IsString() @IsNotEmpty()
  rubric!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

class ExamAnswerDto {
  @IsInt() @Min(0)
  questionIndex!: number;

  @IsString()
  answer!: string;
}

class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers!: ExamAnswerDto[];
}

class GradeOverrideDto {
  @IsInt() @Min(0)
  questionIndex!: number;

  @IsNumber() @Min(0) @Max(1000)
  score!: number;

  @IsOptional() @IsString()
  note?: string;
}

class OverrideGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeOverrideDto)
  overrides!: GradeOverrideDto[];
}

@Controller('classes/:classId/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  create(
    @Param('classId') classId: string,
    @Body() dto: CreateExamDto,
    @Req() req: any,
  ) {
    return this.quizzesService.createExam(req.user.id, classId, dto);
  }

  @Get()
  list(@Param('classId') classId: string, @Req() req: any) {
    return this.quizzesService.getExams(req.user.id, classId);
  }

  @Get(':examId')
  get(@Param('classId') classId: string, @Param('examId') examId: string, @Req() req: any) {
    return this.quizzesService.getExam(req.user.id, classId, examId);
  }

  @Post(':examId/submit')
  @Roles(UserRole.STUDENT)
  submit(
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Body() dto: SubmitExamDto,
    @Req() req: any,
  ) {
    return this.quizzesService.submitExam(req.user.id, classId, examId, dto.answers);
  }

  @Get(':examId/results')
  @Roles(UserRole.TEACHER)
  getResults(
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.getExamResults(req.user.id, classId, examId);
  }

  @Get(':examId/my-result')
  @Roles(UserRole.STUDENT)
  getMyResult(
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Req() req: any,
  ) {
    return this.quizzesService.getMyExamResult(req.user.id, classId, examId);
  }

  @Patch(':examId/results/:resultId')
  @Roles(UserRole.TEACHER)
  overrideGrades(
    @Param('classId') classId: string,
    @Param('examId') examId: string,
    @Param('resultId') resultId: string,
    @Body() dto: OverrideGradesDto,
    @Req() req: any,
  ) {
    return this.quizzesService.overrideGrades(req.user.id, classId, examId, resultId, dto.overrides);
  }
}
