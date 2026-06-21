import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { Class } from './entities/class.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
  ) {}

  async create(classId: string, teacherId: string, dto: CreateLessonDto): Promise<Lesson> {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');

    const lesson = this.lessonRepository.create({ ...dto, classId });
    return this.lessonRepository.save(lesson);
  }

  async findByClass(classId: string, requesterId: string): Promise<Lesson[]> {
    await this.assertAccess(classId, requesterId);
    return this.lessonRepository.find({
      where: { classId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(classId: string, lessonId: string, requesterId: string): Promise<Lesson> {
    await this.assertAccess(classId, requesterId);

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, classId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    return lesson;
  }

  async update(
    classId: string,
    lessonId: string,
    teacherId: string,
    dto: UpdateLessonDto,
  ): Promise<Lesson> {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, classId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    Object.assign(lesson, dto);
    return this.lessonRepository.save(lesson);
  }

  async remove(classId: string, lessonId: string, teacherId: string): Promise<void> {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId, classId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.lessonRepository.remove(lesson);
  }

  // Verifies requester is either the class teacher or an enrolled student
  private async assertAccess(classId: string, requesterId: string): Promise<void> {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
      relations: ['students'],
    });
    if (!cls) throw new NotFoundException('Class not found');

    const isTeacher = cls.teacherId === requesterId;
    const isEnrolled = cls.students.some((s) => s.id === requesterId);

    if (!isTeacher && !isEnrolled) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }
}
