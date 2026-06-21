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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  /** Teacher: create a new class */
  @Post()
  @Roles(UserRole.TEACHER)
  create(@Body() dto: CreateClassDto, @CurrentUser() user: User) {
    return this.classesService.create(user.id, dto);
  }

  /** Teacher: get all classes they own */
  @Get('mine')
  @Roles(UserRole.TEACHER)
  getMyClasses(@CurrentUser() user: User) {
    return this.classesService.findTeacherClasses(user.id);
  }

  /** Student: get all classes they are enrolled in */
  @Get('enrolled')
  @Roles(UserRole.STUDENT)
  getEnrolledClasses(@CurrentUser() user: User) {
    return this.classesService.findEnrolledClasses(user.id);
  }

  /** Teacher or enrolled Student: get class details */
  @Get(':id')
  getClass(@Param('id') id: string, @CurrentUser() user: User) {
    return this.classesService.findById(id, user.id);
  }

  /** Teacher: update their class */
  @Patch(':id')
  @Roles(UserRole.TEACHER)
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.update(id, user.id, dto);
  }

  /** Teacher: delete their class */
  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteClass(@Param('id') id: string, @CurrentUser() user: User) {
    return this.classesService.remove(id, user.id);
  }

  /** Student: join a class using the class code */
  @Post('join')
  @Roles(UserRole.STUDENT)
  joinClass(@Body() dto: JoinClassDto, @CurrentUser() user: User) {
    return this.classesService.join(user.id, dto);
  }

  /** Student: leave an enrolled class */
  @Delete(':id/leave')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  leaveClass(@Param('id') id: string, @CurrentUser() user: User) {
    return this.classesService.leave(id, user.id);
  }
}
