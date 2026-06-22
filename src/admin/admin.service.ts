import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Class } from '../classes/entities/class.entity';
import { Lesson } from '../classes/entities/lesson.entity';
import { Submission } from '../classes/entities/submission.entity';
import { Quiz } from '../classes/entities/quiz.entity';
import { QuizResult } from '../classes/entities/quiz-result.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Quiz) private quizRepo: Repository<Quiz>,
    @InjectRepository(QuizResult) private quizResultRepo: Repository<QuizResult>,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateUserRole(targetId: string, role: UserRole): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.userRepo.save(user);
  }

  async seedAdmin(userId: string): Promise<{ message: string }> {
    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    if (adminCount > 0) {
      throw new Error('An admin already exists. This endpoint is disabled.');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.role = UserRole.ADMIN;
    await this.userRepo.save(user);
    return { message: `User ${user.email} promoted to admin.` };
  }

  async getStats() {
    const [totalUsers, totalTeachers, totalStudents, totalClasses, totalLessons, totalSubmissions, totalQuizResults] =
      await Promise.all([
        this.userRepo.count(),
        this.userRepo.count({ where: { role: UserRole.TEACHER } }),
        this.userRepo.count({ where: { role: UserRole.STUDENT } }),
        this.classRepo.count(),
        this.lessonRepo.count(),
        this.submissionRepo.count(),
        this.quizResultRepo.count(),
      ]);

    return {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalLessons,
      totalSubmissions,
      totalQuizResults,
    };
  }
}
