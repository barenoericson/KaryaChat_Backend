import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Controller('classes/:classId/lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  /** Teacher: add a lesson to their class */
  @Post()
  @Roles(UserRole.TEACHER)
  create(
    @Param('classId') classId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: User,
  ) {
    return this.lessonsService.create(classId, user.id, dto);
  }

  /** Teacher or enrolled Student: list all lessons in a class */
  @Get()
  findAll(@Param('classId') classId: string, @CurrentUser() user: User) {
    return this.lessonsService.findByClass(classId, user.id);
  }

  /** Teacher or enrolled Student: get a single lesson */
  @Get(':id')
  findOne(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.lessonsService.findById(classId, id, user.id);
  }

  /** Teacher: update a lesson */
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  update(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: User,
  ) {
    return this.lessonsService.update(classId, id, user.id, dto);
  }

  /** Teacher: delete a lesson */
  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.lessonsService.remove(classId, id, user.id);
  }
}
