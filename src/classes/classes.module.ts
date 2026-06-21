import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { Lesson } from './entities/lesson.entity';
import { Submission } from './entities/submission.entity';
import { Quiz } from './entities/quiz.entity';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '../users/user.entity';
import { ClassesService } from './classes.service';
import { LessonsService } from './lessons.service';
import { SubmissionsService } from './submissions.service';
import { QuizzesService } from './quizzes.service';
import { ClassesController } from './classes.controller';
import { LessonsController } from './lessons.controller';
import { SubmissionsController } from './submissions.controller';
import { QuizzesController } from './quizzes.controller';
import { ExamsController } from './exams.controller';
import { AiService } from '../ai/ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, Lesson, Submission, Quiz, QuizResult, User]),
    ConfigModule,
  ],
  providers: [ClassesService, LessonsService, SubmissionsService, QuizzesService, AiService],
  controllers: [ClassesController, LessonsController, SubmissionsController, QuizzesController, ExamsController],
  exports: [ClassesService, LessonsService, SubmissionsService, QuizzesService],
})
export class ClassesModule {}
