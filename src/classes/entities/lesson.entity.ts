import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from './class.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', name: 'code_snippet', nullable: true })
  codeSnippet: string | null;

  @Column({ default: 1 })
  order: number;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @ManyToOne(() => Class, (cls) => cls.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id' })
  classId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
