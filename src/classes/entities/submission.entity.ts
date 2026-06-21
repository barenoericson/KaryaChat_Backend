import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Lesson } from './lesson.entity';
import { Class } from './class.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'lesson_id' })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'class_id' })
  classId: string;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'file_url', length: 500 })
  fileUrl: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', length: 100 })
  fileType: string;

  @Column({ name: 'file_size', type: 'int', default: 0 })
  fileSize: number;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
