import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { User } from '../users/user.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

// Avoids visually ambiguous chars: 0/O, 1/I/L
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(teacherId: string, dto: CreateClassDto): Promise<Class> {
    const classCode = await this.generateUniqueCode();
    const newClass = this.classRepository.create({
      ...dto,
      classCode,
      teacherId,
    });
    return this.classRepository.save(newClass);
  }

  async findTeacherClasses(teacherId: string): Promise<Class[]> {
    // Only select lightweight lesson fields — skip content/codeSnippet (large text)
    return this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.lessons', 'lesson')
      .select([
        'class.id', 'class.name', 'class.description', 'class.language',
        'class.classCode', 'class.isArchived', 'class.teacherId',
        'class.createdAt', 'class.updatedAt',
        'lesson.id', 'lesson.title', 'lesson.order', 'lesson.deadline', 'lesson.classId',
      ])
      .where('class.teacherId = :teacherId', { teacherId })
      .orderBy('class.createdAt', 'DESC')
      .getMany();
  }

  async findEnrolledClasses(studentId: string): Promise<Class[]> {
    // Only select lightweight lesson fields — skip content/codeSnippet (large text)
    return this.classRepository
      .createQueryBuilder('class')
      .innerJoin('class.students', 'student', 'student.id = :studentId', { studentId })
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('class.lessons', 'lesson')
      .select([
        'class.id', 'class.name', 'class.description', 'class.language',
        'class.classCode', 'class.isArchived', 'class.teacherId',
        'class.createdAt', 'class.updatedAt',
        'teacher.id', 'teacher.username', 'teacher.email',
        'lesson.id', 'lesson.title', 'lesson.order', 'lesson.deadline', 'lesson.classId',
      ])
      .where('class.isArchived = false')
      .orderBy('class.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string, requesterId: string): Promise<Class> {
    const cls = await this.classRepository.findOne({
      where: { id },
      relations: ['teacher', 'lessons', 'students'],
    });

    if (!cls) throw new NotFoundException('Class not found');

    const isTeacher = cls.teacherId === requesterId;
    const isEnrolled = cls.students.some((s) => s.id === requesterId);

    if (!isTeacher && !isEnrolled) {
      throw new ForbiddenException('You do not have access to this class');
    }

    return cls;
  }

  async update(id: string, teacherId: string, dto: UpdateClassDto): Promise<Class> {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');

    Object.assign(cls, dto);
    return this.classRepository.save(cls);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId) throw new ForbiddenException('Not your class');

    await this.classRepository.remove(cls);
  }

  async join(studentId: string, dto: JoinClassDto): Promise<Class> {
    const cls = await this.classRepository.findOne({
      where: { classCode: dto.classCode },
      relations: ['students'],
    });

    if (!cls) throw new NotFoundException('No class found with that code');
    if (cls.isArchived) throw new BadRequestException('This class is archived');
    if (cls.teacherId === studentId) {
      throw new BadRequestException('Teachers cannot enroll in their own class');
    }

    const alreadyEnrolled = cls.students.some((s) => s.id === studentId);
    if (alreadyEnrolled) throw new ConflictException('Already enrolled in this class');

    const student = await this.userRepository.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    cls.students.push(student);
    return this.classRepository.save(cls);
  }

  async leave(classId: string, studentId: string): Promise<void> {
    const cls = await this.classRepository.findOne({
      where: { id: classId },
      relations: ['students'],
    });

    if (!cls) throw new NotFoundException('Class not found');

    cls.students = cls.students.filter((s) => s.id !== studentId);
    await this.classRepository.save(cls);
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let exists: boolean;

    do {
      code = Array.from(
        { length: 7 },
        () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
      ).join('');
      exists = !!(await this.classRepository.findOne({ where: { classCode: code } }));
    } while (exists);

    return code;
  }
}
