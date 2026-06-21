import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export interface QuizQuestion {
  type: 'mcq' | 'fill' | 'short' | 'coding' | 'open-ended' | 'essay';
  question: string;
  options?: string[];
  answer: string;       // correct answer for mcq/fill/short; sample/expected answer for AI-graded types
  maxScore?: number;    // points this question is worth (default: 1 for mcq/fill/short, 10 for others)
  explanation?: string;
}

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ name: 'lesson_id', type: 'varchar', nullable: true })
  lessonId: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ type: 'jsonb' })
  questions: QuizQuestion[];

  // Exam-specific fields (only set when isExam = true)
  @Column({ name: 'is_exam', default: false })
  isExam: boolean;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  rubric: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
