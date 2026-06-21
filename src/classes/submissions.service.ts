import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { Class } from './entities/class.entity';
import { Lesson } from './entities/lesson.entity';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  async submit(
    studentId: string,
    classId: string,
    lessonId: string,
    file: Express.Multer.File,
    apiBaseUrl: string,
  ): Promise<Submission> {
    await this.assertStudentAccess(classId, studentId);
    await this.assertLessonExists(classId, lessonId);

    // If student already submitted, replace it
    const existing = await this.submissionRepository.findOne({
      where: { studentId, lessonId, classId },
    });

    const fileUrl = `${apiBaseUrl}/uploads/${file.filename}`;

    if (existing) {
      existing.fileUrl = fileUrl;
      existing.fileName = file.originalname;
      existing.fileType = file.mimetype;
      existing.fileSize = file.size;
      return this.submissionRepository.save(existing);
    }

    const submission = this.submissionRepository.create({
      studentId,
      lessonId,
      classId,
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });
    return this.submissionRepository.save(submission);
  }

  async getForLesson(
    teacherId: string,
    classId: string,
    lessonId: string,
  ): Promise<Submission[]> {
    await this.assertTeacherAccess(classId, teacherId);
    await this.assertLessonExists(classId, lessonId);

    return this.submissionRepository.find({
      where: { lessonId, classId },
      relations: ['student'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getMySubmission(
    studentId: string,
    classId: string,
    lessonId: string,
  ): Promise<Submission | null> {
    await this.assertStudentAccess(classId, studentId);
    return this.submissionRepository.findOne({
      where: { studentId, lessonId, classId },
    });
  }

  private async assertStudentAccess(classId: string, studentId: string): Promise<void> {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Class not found');
    const isEnrolled = cls.students.some((s) => s.id === studentId);
    if (!isEnrolled) throw new ForbiddenException('You are not enrolled in this class');
  }

  private async assertTeacherAccess(classId: string, teacherId: string): Promise<void> {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');
  }

  private async assertLessonExists(classId: string, lessonId: string): Promise<void> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, classId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
  }
}
