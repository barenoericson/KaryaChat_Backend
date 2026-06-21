import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Class } from '../classes/entities/class.entity';
import { Lesson } from '../classes/entities/lesson.entity';
import { Submission } from '../classes/entities/submission.entity';
import { Quiz } from '../classes/entities/quiz.entity';
import { QuizResult } from '../classes/entities/quiz-result.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Class, Lesson, Submission, Quiz, QuizResult])],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
