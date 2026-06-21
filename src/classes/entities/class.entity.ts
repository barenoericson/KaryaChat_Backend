import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Lesson } from './lesson.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ length: 100 })
  language: string;

  @Column({ unique: true, length: 10, name: 'class_code' })
  classCode: string;

  @Column({ default: false, name: 'is_archived' })
  isArchived: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'class_enrollments',
    joinColumn: { name: 'class_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'student_id', referencedColumnName: 'id' },
  })
  students: User[];

  @OneToMany(() => Lesson, (lesson) => lesson.class, { cascade: true })
  lessons: Lesson[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
